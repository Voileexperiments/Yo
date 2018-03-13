process.on('unhandledRejection', (err, promise) => {
    console.error(err ? err.stack : promise);
});
require('dotenv').config()
const Discord = require('discord.js');
const Bot = new Discord.Client();
const yaml = require('js-yaml');
const reload = require('require-reload')(require);
const fs = require('fs');
const tweet = require('./commands/pull/tweet');
const oeis = require('./commands/pull/oeis');
const config = yaml.safeLoad(fs.readFileSync('./app.yaml', 'utf8'));

Bot.login(config.token);

// Get document, or throw exception on error
Bot.on('ready', () => {
  console.log("The eagle has landed");
});

Bot.on('message', msg => {
  if(msg.author.bot/*msg.author.id == config.bot_self*/) return;
  //if(!msg.content.startsWith(config.prefix)) return;
  //console.log(msg);
  var text = msg.content.trim().split(/ +/);
  if(text.length&&text[0]==='yo') {
	var [cmd, ...args] = text.slice(1);
	if(cmd==='oeis') oeis.searchSequence(msg,...args);  
  }
});

