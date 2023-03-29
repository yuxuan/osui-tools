import path from 'path';
import fs from 'fs';
import template from 'lodash.template';
import forEach from 'lodash.foreach';
import {config} from './config'

const remote = Boolean(process.argv[2] === 'false' ? false : true);
console.log('remote', remote, process.argv[2]);
const targetComponents = Boolean(process.argv[3] === 'false' ? false: true);
console.log('targetComponents', targetComponents)

const BCE_HOST = `https://baidu-ee-fe-sites.cdn.bcebos.com/${config.PROJECT}@diffReport@${config.NEXT_VERSION}/screenshots`;

const SCREENSHOT_PATH = path.join('./', 'screenshots');
const STORED_COMPONENTS_LIST = path.join(__dirname, '../storedComponentList.json');
const TARGET_COMPONENTS_LIST = path.join(__dirname, '../targetComponentsList.json');

const compiled = template(`
<html>
    <body>
        <% forEach(components, function(component) { %>
            <h3><%- component.title %></h3>
            <div style="display: flex; align-items: center; margin-bottom: 20px">
                <div style="width: 33.333%">
                <h4><%- component.currentVersion %></h4>
                <img style="width: 100%" src="<%- component.current %>" />
                </div>
                <div style="width: 33.333%">
                <h4><%- component.nextVersion %></h4>
                <img style="width: 100%" src="<%- component.new %>" />
                </div>
                <div  style="width: 33.333%">
                <h4>DIFF</h4>
                <img style="width: 100%" src="<%- component.result %>" />
                </div>
            </div>
        <% }); %>
    </body>
</html>
`,
{ 'imports': { 'forEach': forEach } }
);


const getUrl = (host: string, version: string, component: string) => {
    return `${host}/${version}/${component}.png`
}

const components = require(targetComponents ? TARGET_COMPONENTS_LIST : STORED_COMPONENTS_LIST).map(
    (component: string) => {
        const host = remote ? BCE_HOST : SCREENSHOT_PATH;
        return {
            current: getUrl(host, config.CURRENT_VERSION, component),
            new: getUrl(host, config.NEXT_VERSION, component),
            result: getUrl(host, 'result', component),
            title: component,
            currentVersion: config.CURRENT_VERSION,
            nextVersion: config.NEXT_VERSION,
        }
    }
);

const html = compiled({ 'components': components })
fs.writeFileSync('./diffReport/index.html', html, {encoding: 'utf-8'});

console.log('DONE');