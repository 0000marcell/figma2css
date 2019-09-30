var dic = require('./dictionary');

module.exports = {
  'letterSpacing': function(item, type) {
    if(type === 'prop') {
      return 'letter-spacing';
    } else if(type === 'value') {
      return `${item.style['letterSpacing']}px`;
    }
  },
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
      let val;
      if(item.style['fontPostScriptName']) {
        let weight = item.style['fontPostScriptName'].split('-')[1];
        if(weight)
          val = weight; 
      } else {
        val = item.style['fontWeight'];
      }
      if(dic[val]) 
        return dic[val];
      else
        return val; 
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
      if(dic[item.style['textCase']]) 
        return dic[item.style['textCase']]
      else
        return item.style['textCase']
    }
  }
}
