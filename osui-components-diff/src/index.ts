/* eslint-disable no-console, global-require */
import path from 'path';
import fs from 'fs';
import process from 'process';
import childProcess from 'child_process';
import isEmpty from 'lodash.isempty';
import puppeteer from 'puppeteer';
import mkdirp from 'mkdirp';
import actions, {Action} from './actions';
import {config} from './config';

let CURRENT_URL = `http://eefe.baidu-int.com/sites/${config.PROJECT}@${config.CURRENT_VERSION}`;
let NEXT_URL = `http://eefe.baidu-int.com/sites/${config.PROJECT}@${config.NEXT_VERSION}`;


const BASE_DIR = path.resolve(__dirname, '..');
const SCREENSHOT_PATH = path.resolve(BASE_DIR, 'screenshots');
const SCREENSHOT_RESULT_PATH = path.resolve(BASE_DIR, 'screenshots', 'result');
const STORED_COMPONENTS_LIST = path.resolve(BASE_DIR, 'storedComponentList.json');

type ComponentName = string;

interface Components {
    [key: string]: Action | undefined;
}

const getScreenshotsVersionPath = (version: string) => path.join(SCREENSHOT_PATH, version);
const getScreenshotsComponentPath = (version: string, component: ComponentName) => (
    path.join(getScreenshotsVersionPath(version), `${component}.png`)
);
const getScreenshotsComponentDiffPath = (component: ComponentName) => (
    path.join(SCREENSHOT_RESULT_PATH, `${component}.png`)
);

let browser: puppeteer.Browser;
let page: puppeteer.Page;

const puppeteerPrepare = async () => {
    browser = await puppeteer.launch();
    page = await browser.newPage();
    await page.setViewport({
        width: 1095,
        height: 2020,
    });
};

const projectPrepare = async () => {
    await mkdirp(getScreenshotsVersionPath(config.CURRENT_VERSION));
    await mkdirp(getScreenshotsVersionPath(config.NEXT_VERSION));
};

const bindActions = (components: ComponentName[]): Components => {
    const bindComponents = components.reduce(
        (components: Components, componentName: string) => {
            components[componentName] = actions[componentName];
            return components;
        },
        {}
    );
    return bindComponents;
};

const getComponents = (): Components | false => {
    try {
        const components = require(STORED_COMPONENTS_LIST);
        if (isEmpty(components)) {
            return false;
        }
        return bindActions(components);
    }
    catch (e) {
        return false;
    }
};

const demoListPrepare = async (): Promise<Components> => {
    const storedComponents = getComponents();
    console.log(storedComponents);
    if (storedComponents) {
        return storedComponents;
    }
    // 从浏览器获取components
    await page.goto(CURRENT_URL + '/', {
        waitUntil: 'networkidle0',
    });
    // expand all
    await page.$$eval(
        'button.sidebar-item',
        elements => elements.forEach(element => (element as HTMLElement).click())
    );

    const components1 = await page.$$eval(
        'a.sidebar-item',
        elements => elements.map(element => element.id)
    );

    // 去掉设计文档的内容
    const components = components1.filter(component => !component.includes('设计文档'));
    fs.writeFileSync(STORED_COMPONENTS_LIST, JSON.stringify(components), {encoding: 'utf-8'});
    // bind actions
    console.log(components);
    return bindActions(components);
};

const screenshot = async (component: ComponentName, url: string, version: string) => {
    console.log(url);
    await page.goto(url, {
        waitUntil: 'networkidle0',
    });

    const frame: puppeteer.Frame|undefined = page.frames().find(frame => frame.name() === 'storybook-preview-iframe');
    if (!frame) {
        throw Error('Cannot find: storybook-preview-iframe');
    }

    await frame.waitForSelector('.sb-show-main');
    const element = await frame.$('.sb-show-main');
    if (!element) {
        throw Error('Cannot find: .sb-show-main');
    }

    // 如果有额外的action
    const components = getComponents();
    if (!components) {
        throw Error('No Components list');
    }

    const action = components[component];
    if (action) {
        await action(frame);
    }

    const boundingBox = await element.boundingBox();
    const pngPath = getScreenshotsComponentPath(version, component);
    await element.screenshot({
        path: pngPath,
        clip: {
            x: boundingBox!.x,
            y: boundingBox!.y,
            width: Math.min(boundingBox!.width, page.viewport().width),
            height: Math.min(boundingBox!.height, page.viewport().height),
        },
    });
};

const doScreenshot = async (component: ComponentName) => {
    const currentDemo = `${CURRENT_URL}/?path=/story/${component}`;
    const nextDemo = `${NEXT_URL}/?path=/story/${component}`;

    await screenshot(component, currentDemo, config.CURRENT_VERSION);
    await screenshot(component, nextDemo, config.NEXT_VERSION);

    console.log('DONE screenshot: ', component);
};

const doCompare = (component: ComponentName) => {
    const current = getScreenshotsComponentPath(config.CURRENT_VERSION, component);
    const next = getScreenshotsComponentPath(config.NEXT_VERSION, component);
    const result = getScreenshotsComponentDiffPath(component);
    const pixelmatchExecute = path.resolve(BASE_DIR, 'node_modules/.bin/pixelmatch');
    const command = `${pixelmatchExecute} ${current} ${next} ${result} 0.01`;
    childProcess.exec(command, (_, stdout, stderror) => {
        if (stderror) {
            console.log(stderror);
        }
        console.log(stdout);
    });
};

const screenshots = async (components: string[]) => {
    for (const component of components) {
        await doScreenshot(component);
        doCompare(component);
    }
}

const main = async () => {
    await projectPrepare();
    await puppeteerPrepare();
    const components = await demoListPrepare();
    const targetComponent = process.argv[2];
    if (targetComponent) {
        await screenshots(Object.keys(components).filter(name => name.includes(targetComponent)))
    }
    else {
        await screenshots(Object.keys(components))
    }

    browser.close();
};

main();


