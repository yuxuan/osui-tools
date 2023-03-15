import puppeteer from 'puppeteer';

export declare type Action = (page: puppeteer.Page | puppeteer.Frame) => Promise<void>;

export interface Actions {
    [key: string]: Action;
}
const select: Action = async (page: puppeteer.Page | puppeteer.Frame) => {
    await page.click('.osui-select');
};

const drawer: Action = async (page: puppeteer.Page | puppeteer.Frame) => {
    await page.click('.osui-button');
    // wait 1 second
    await new Promise(resolve => setTimeout(resolve, 1000));
};

const modal: Action = async (page: puppeteer.Page | puppeteer.Frame) => {
    await page.click('.osui-button');
    // wait 1 second
    await new Promise(resolve => setTimeout(resolve, 1000));
};

const cascader: Action = async (page: puppeteer.Page | puppeteer.Frame) => {
    await page.click('.osui-cascader');
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.click('.ant-cascader-menu .ant-cascader-menu-item');
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.click('.ant-cascader-menu:nth-child(2) .ant-cascader-menu-item');
    await new Promise(resolve => setTimeout(resolve, 500));
};

const actions: Actions = {
    '数据录入-select-选择器--demo': select,
    '反馈-drawer-抽屉--demo': drawer,
    '反馈-modal-对话框--demo': modal,
    '数据录入-cascader-级联选择--demo': cascader,
};

export default actions;
