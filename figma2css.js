#!/usr/bin/env node

const program = require('commander');
const readstdin = require('readstdin');
const pkg = require('./package.json');

let ADD_WIDTH = false,
    ADD_HEIGHT = false;

const validProperties = {
  'textDecoration': function(item, type){ 
    if(type === 'prop') {
      return 'text-decoration';
    } else if(type === 'value') {
      return item.style['textDecoration'].toLowerCase();
    }
  },
  'fontFamily': function(item, type){ 
    if(type === 'prop') {
      return 'font-family';
    } else if(type === 'value') {
      return item.style['fontFamily'];
    }
  },
  'fontWeight': function(item, type){ 
    if(type === 'prop') {
      return 'font-weight';
    } else if(type === 'value') {
      // if the font has postscript use it instead
      if(item.style['fontPostScriptName']) {
        let weight = item.style['fontPostScriptName'].split('-')[1];
        if(weight)
          return weight;
      }
      return item.style['fontWeight'];
    } 
  },
  'fontSize': function(item, type){ 
    if(type === 'prop') {
      return 'font-size';
    } else if(type === 'value') {
      return item.style['fontSize'] + 'px';
    }
  },
  'textCase': function(item, type){ 
    if(type === 'prop') {
      return 'text-transform';
    } else if(type === 'value') {
      if(item.style['textCase'] === 'UPPER') {
        return 'uppercase';
      } else if(item.style['textCase'] === 'LOWER'){
        return 'lowercase';
      } else if(item.style['textCase'] === 'TITLE') {
        return 'capitalize';
      } 
      return item.style['textCase'];
    }
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

/**
 * parse options inside the name of the object 
 * ex: .button[W-H]; this would capture height and width
 * of the element
*/
function parseOptions(item) {
  if(item.name.match(/\[(.*?)\]/)) {
    let options = item.name.match(/\[(.*?)\]/)[1],
      obj = {};

    options.split('-').forEach((opts) => {
      obj[opts] = true; 
    }); 
    return obj;
  }
  return {};
}

/**
 * this function is used in all vector transformations
 */
function transformVector(css, item) {
  let opts = parseOptions(item); 
  css += `${item.name.split('[')[0]} {\n`;
  if(ADD_WIDTH || opts['W']) 
    css += `\twidth: ${item.absoluteBoundingBox.width}px !important;\n`;
  if(ADD_HEIGHT || opts['H'])
    css += `\theight: ${item.absoluteBoundingBox.height}px !important;\n`;
  if(item.fills.length) {
    css += `\tbackground-color: ${formatColor(item.fills[0].color)} !important;\n`;
  }
  if(item.strokes.length) {
    css += `\tborder: ${item.strokeWeight}px ${item.strokes[0].type} ${formatColor(item.strokes[0].color)} !important;\n`;
  }
  if(item.cornerRadius) {
    css += `\tborder-radius: ${item.cornerRadius}px !important;\n`;
  }
  css += '}\n\n';
  return css;
}

let styleTransformers = {
  'TEXT': function(css, item) {
    css += `${item.name} {\n`;
    Object.keys(item.style).forEach((key) => {
      if(validProperties[key]) {
        let prop = validProperties[key](item, 'prop'),
            value = validProperties[key](item, 'value');
        css += `\t${prop}: ${value} !important;\n`;
      }
    });
    css += `\tcolor: ${formatColor(item.fills[0].color)} !important;\n`
    css += '}\n\n';
    return css;
  },
  'VECTOR': function(css, item) {
    return transformVector(css, item); 
  },
  'RECTANGLE': function(css, item) {
    return transformVector(css, item); 
  }
}

let classesList = [];

/**
* append to css variable based 
* on the type of nome, creating the class 
* and styles
*/
function appendCSS(item, css) {
  if(item.type === 'TEXT' || item.type === 'VECTOR' || item.type === 'RECTANGLE') {
    if((item.name.match(/^\./) || item.name.match(/^\#/)) && 
      !classesList.find(elem => elem === item.name+item.type)){
      classesList.push(item.name+item.type);
      css = styleTransformers[item.type](css, item);
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

program.version(pkg.version);

program
  .description('transform figmadata in to css')
  .option('-w, --width', 'do not add width')
  .option('-h, --height', 'do not add height')
  .action(async function(cmd) {
    let data = null;
    ADD_WIDTH = cmd['width'];
    ADD_HEIGHT = cmd['height'];
    data = await readstdin(); 
    data = JSON.parse(data)['document'];
    if(!data) {
      console.error('no data was piped to the program!');
      return;
    }
    
    let css = '',
      objectName = data['name'];
    if(data['children']) {
      data['children'].forEach((item) => {
        css = appendCSS(item, css);   
      });
    }else {
      css = appendCSS(data, css);
    }

    if(!css) {
      return;
    }

    console.log(`// ${objectName} GENERATED BY FIGMA2CSS ${Date()} START`)
    console.log(css);
    console.log(`// ${objectName} GENERATED BY FIGMA2CSS ${Date()} END`)
  });



program.parse(process.argv);
