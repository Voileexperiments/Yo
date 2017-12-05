const cheerio = require('cheerio');
const request = require('request').defaults({jar: true});
const tweets = require('../../forklib/scrape-twitter/index.js');
const streamToPromise = require('stream-to-promise');

const SCRAPE_TWITTER_CONFIG = '.scrape-twitter';
const env = (function getEnv() {
  require('dotenv').config({ path: SCRAPE_TWITTER_CONFIG });
  return {
    SCRAPE_TWITTER_CONFIG: SCRAPE_TWITTER_CONFIG,
    TWITTER_USERNAME: process.env.TWITTER_USERNAME,
    TWITTER_PASSWORD: process.env.TWITTER_PASSWORD,
    TWITTER_KDT: process.env.TWITTER_KDT // used to determine whether a new device is logging in
  };
})();

function fetchTweet(msg) {
  function returnWithError(str) {
    msg.channel.send(str);
  }
  var [user, amt, opt] = msg.content.split(' ');
  var name = msg.channel.members.find(member => member.user.id===msg.author.id).nickname || msg.author.username;
  const pageType = new Set(['m', 'r']);
  if(user===undefined) return failWithError("You did not provide any users to fetch from!");
  if(amt===undefined) amt = "5";
  if(amt===""||amt in pageType) [opt, amt] = [amt, "5"];
  amt = Number.parseInt(amt);
  if(Number.isNaN(amt)) return failWithError("Invalid amount!");
  if(!Number.isInteger(amt)) return failWithError("A tweet is a tweet, you can't say it's only a half");
  if(amt<0) return failWithError("A negative amount would only make sense if I can travel to the future");
  if(amt===0) return failWithError("Okay, here's the nothingness you've asked to fetch");
  amt = Math.min(amt,5);
  
  if(opt!==""&&!opt in pageType) return failWithError("That's not a valid option, either omit it or use \"r\" (with replies) / \"m\" (media only)");
  
  var stream;
  if(opt == 'm') {
    stream = new tweets.MediaTimelineStream(user, {count: amt, env});
  } else if(opt == 'r') {
    stream = new tweets.TimelineStream(user, {replies: true, count: amt, env});
  } else {
    stream = new tweets.TimelineStream(user, {retweets: true, count: amt, env});
  }
  streamToPromise(stream).then(tweets => {
    msg.channel.send(msg.author + " queried " + tweets.length + ` tweet${tweets.length===1?'':'s'}, requested ` + amt + ".");
    tweets.forEach((tweet, i) => {
      console.log(tweet);
      let data = {
        "embed": {
          "color": 0xA260F6,
          "footer": {
            "icon_url": `https://cdn.discordapp.com/avatars/196327501188956160/${msg.author.avatar}.webp?size=1024`,
            "text": `Contains ${tweet.images.length} picture${tweet.images.length===1?'':'s'}. Tweet ${i+1} of ${tweets.length}`
          },
          "author": {
            "name": tweet.text,
            "url": `https://twitter.com/${tweet.screenName}/status/${tweet.id}`
          }
        }
      };
      if(tweet.images.length) data.embed.image = {"url": tweet.images[0]};
      msg.channel.send('`'+`Posted by ${tweet.screenName} at ${new Date(tweet.time).toLocaleString()}`+'`', data);
    });
  });
}

//fetchTweet(undefined, "emma_gear 5");

module.exports = {fetchTweet};