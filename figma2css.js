#!/usr/bin/env node

// Functions 
// preprocessTree
// generateComponents
// fetchProject
const fetch = require('node-fetch');
const headers = new fetch.Headers();
const figma = require('./lib/figma');
const program = require('commander');
const fs = require('fs');

const baseUrl = 'https://api.figma.com';

const validProperties = {
  'fontFamily': 'font-family',
  'fontWeight': 'font-weight',
  'fontSize': 'font-size',
  'letterSpacing': 'letter-spacing',
  'lineHeightPx': 'letter-height'
}

async function fetchProject() {
  let config = JSON.parse(fs.readFileSync('./.figma2css'));
  headers.set('X-Figma-Token', config.token);
  let resp = await fetch(`${baseUrl}/v1/files/${config.projectId}`, 
    {headers});
  let data = await resp.json();
  data['config'] = config;
  data['headers'] = headers;
  return data;
}

/**
* finds a object inside the data
* ex: findObject(data, 'CANVAS', 'Desktop')
*     findObject(data, 'FRAME', 'Home')
*/
function findObject(data, type, name) {
  let result = null;
  for (var i = 0; i < data['children'].length; i++) {
    if(data['children'][i].type === type && 
      data['children'][i].name === name) {
      result = data['children'][i];
      break;
    }
  }
  if(result) {
    return result;
  } else if(data['children']) {
    for (var i = 0; i < data['children'].length; i++) {
      result = findObject(data['children'][0], type, name);
      break;
    }
    return result;
  } else {
    return null;
  }
}



/**
* format color from {r: 0, g: 0, b: 0} 
* to rgb(0, 0, 0)
*/
function formatColor(ocolor) {
  let result = 'rgb(';
  Object.keys(ocolor).forEach((key, i) => {
    if(i < 3) {
      result += `${ocolor[key] * 255}`;
      if(i < 2) 
        result += ',';
    }
  });
  result += ');';
  return result;
}

let iterator = 0;

/**
* append to css variable based 
* on the type of nome, creating the class 
* and styles
*/
function appendCSS(item, css) {
  if(item.type === 'TEXT') {
    iterator += 1;
    css += `.${item.name} {\n`;
    Object.keys(item.style).forEach((key) => {
      if(validProperties[key]) {
        let propName = validProperties[key];
        css += `\t${propName}: ${item.style[key]};\n`;
      }
    });
    css += '}\n\n';
  } else {
    if(item.children) {
      item.children.forEach((subitem) => {
        css = appendCSS(subitem, css); 
      });
    }
  }
  return css;
}

program
  .version('0.1.3')
  .description('Generates css styles from figmas designs');

program
  .command('generate')
  .alias('g')
  .description('generate css file')
  .option('-f, --file <file>', 'file name')
  .option('-t, --type <type>', 'type of object to search')
  .option('-n, --name <name>', 'name of the object to search')
  .option('-o, --output', 'log project data output to stdout')
  .action(function (cmd) {
    fetchProject().then((data) => {
     if(cmd.output) 
        console.log(data.document);
      let result = findObject(data.document, cmd['type'], cmd['name']);
      let css = '';
      result['children'].forEach((item) => {
        css = appendCSS(item, css);   
      });

      console.log(css);

      // fs.writeFile(cmd['file'] || "./styles.css", css, function(err) {
      //   if(err) 
      //     console.log(err);
      //   console.log("The file was saved!");
      // });  
    }).catch((e) => {
      console.log('error: ', e); 
    });
  });

program
  .command('watch')
  .alias('w')
  .description('watch for changes in the figma projects and generate the components')
  .action(async () => {
    let data = await fetchProject(),
      currentDate = data.lastModified;
    setInterval(async () => {
      data = await fetchProject();
      if(data.lastModified > currentDate) {
        generateComponents(data);
        currentDate = data.lastModified;
        console.log(`project changed, making modifications!`);
      }
    }, 1000);
    console.log(`watching figma project ${data.config.projectId}`);
    console.log(`last modified ${currentDate}`);
  });

program.parse(process.argv);
