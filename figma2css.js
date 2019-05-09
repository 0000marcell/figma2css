#!/usr/bin/env node

const fetch = require('node-fetch');
const headers = new fetch.Headers();
const figma = require('./lib/figma');
const program = require('commander');
const fs = require('fs');
const CLI = require('clui'),
    Spinner = CLI.Spinner;

const baseUrl = 'https://api.figma.com';

const validProperties = {
  'fontFamily': { name: 'font-family', unit: '' },
  'fontWeight': { name: 'font-weight', unit: '' },
  'fontSize': { name: 'font-size', unit: 'px' },
  'textCase': { name: 'text-transform', unit: '' }
}

function readStdin() {
  let stdin = process.stdin,
    inputChunks = [];
  return new Promise(function(resolve){
    stdin.resume();
    stdin.setEncoding('utf8');

    stdin.on('data', function (chunk) {
      inputChunks.push(chunk);
    });

    stdin.on('end', function () {
      resolve(inputChunks.join("")); 
    });  
  });
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

  //console.log('parent: ', data.name);

  if(!data.children)
    return result;

  for (var i = 0; i < data['children'].length; i++) {
    // console.log('type: ', data['children'][i].type);
    // console.log('name: ', data['children'][i].name);
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
      result = findObject(data['children'][i], type, name);
      //console.log('result: ', result);
      if(result)
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
  result += ')';
  return result;
}

let classesList = [];

/**
* append to css variable based 
* on the type of nome, creating the class 
* and styles
*/
function appendCSS(item, css) {
  if(item.type === 'TEXT') {
    if(item.name.match(/^\./) && 
      !classesList.find(elem => elem === item.name)){
      classesList.push(item.name);
      css += `${item.name} {\n`;
      Object.keys(item.style).forEach((key) => {
        if(validProperties[key]) {
          let prop = validProperties[key];
          css += `\t${prop.name}: ${item.style[key]}${prop.unit} !important;\n`;
        }
      });
      css += `\tcolor: ${formatColor(item.fills[0].color)} !important;\n`
      css += '}\n\n';
    }
  } else {
    if(item.children) {
      item.children.forEach((subitem) => {
        css = appendCSS(subitem, css); 
      });
    }
  }
  return css;
}

function progressSpinner() {
  // var countdown = new Spinner('Generating css...  ', 
  //   ['⣾','⣽','⣻','⢿','⡿','⣟','⣯','⣷']);

  // countdown.start();

  // var number = 10;
  // setInterval(function () {
  //   number--;
  //   countdown.message('Exiting in ' + number + ' seconds...  ');
  //   if (number === 0) {
  //     process.stderr.write('\n');
  //     process.exit(0);
  //   }
  // }, 1000);
}

program
  .version('0.1.3')
  .description('Generates css styles from figmas designs');

program
  .command('find')
  .alias('f')
  .description('find figma object')
  .option('-t, --type <type>', 'type of object to search')
  .option('-n, --name <name>', 'name of the object to search')
  .option('-f, --fetch', 'fetch project before trying to find the item')
  .action(async (cmd) => {
    let data = null;
    if(cmd['fetch']) {
      data = await fetchProject();
      data = data.document;
    } else {
      data = await readStdin(); 
      data = JSON.parse(data);
    }
    
    let result = findObject(data, cmd['type'], cmd['name']);

    if(!result) {
      console.error('Could find the object that you passed: ');
      return;
    } 

    console.log(JSON.stringify(result));
  });

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

      console.log(data.document);

      return;

      let result = findObject(data.document, cmd['type'], cmd['name']);
      let css = '';

      if(!result) {
        console.log('Could find the object that you passed: ');
        return;
      }

      progressSpinner();

      result['children'].forEach((item) => {
        css = appendCSS(item, css);   
      });
      console.log('// GENERATED BY FIGMA2CSS START')
      console.log(css);
      console.log('// GENERATED BY FIGMA2CSS END')

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
