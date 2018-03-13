const request = require('request').defaults({
    jar: true
});
const moment = require('moment');

const fields = ['id', 'comment', 'reference', 'link', 'formula', 'example', 'maple', 'mathematica', 'program', 'xref', 'keyword', 'offset', 'author', 'ext', 'references', 'revision', 'time', 'created'];
const eats = {
    'number': s => /\d+/.test(s),
    'field': s => fields.includes(s),
    'nothing': () => true
}
const FIELD_SHOW_MAX = 5;

const actions = {
    'first': eats.nothing,
    'take': eats.number,
    'start': eats.number,
    'show': eats.field
};

function searchSequence(msg, ...args) {
    const returnWithError = str => msg.channel.send(str);
    if (args.join('') === 'help') {
        var helpstr = 'TODO: refactor help strings to a separate thing';


        return msg.channel.send(helpstr);
    }

    var author = msg.channel.members.find(member => member.user.id === msg.author.id) || msg.author;
    var name = author.nickname !== undefined ? author.nickname : author.username;
    var start = 0,
        query = "",
        first = false,
        showFields = new Set(),
        take = 10;
    args = args.reverse();
    do {
        if (!args.length) return returnWithError('Parse error: Message exhausted without residue');
        var arg = args.pop();
        if (actions[arg] !== undefined) {
            var next = [];
            while (args.length && next.length < actions[arg].length) next.push(args.pop());
            if (!args.length) return returnWithError(`Parse error: Message exhausted without residue during token ${arg}`);
            if (!actions[arg](...next)) return returnWithError(`Parse error: expected ${actions[arg].name} after token ${arg} but got ${!next.length ? 'nothing' : JSON.stringify(next).replace(/^\[|\]$/g,'')}. Please use "oeis help" to see how to use this command.`)
            if (arg === 'first') first = true;
            else if (arg === 'start') start = +next[0];
            else if (arg === 'take') take = Math.min(10, Math.max(1, +next[0]));
            else if (arg === 'show') showFields.add(next[0]);
        } else {
            query = [arg, ...args.reverse()].join(' ');
            break;
        }
    } while (args.length);
    if (!query) return returnWithError('Error: Query is empty!'); // err on the safe side

    showFields = [...showFields].sort((a, b) => fields.indexOf(a) - fields.indexOf(b));

    var url = encodeURI(`https://oeis.org/search?q=${query}&start=${start}`);

    request.get({
        url: url + '&fmt=json',
        json: true
    }, (err, res, json) => {
        if (err) {
            return returnWithError('Error:', err);
        } else if (res.statusCode !== 200) {
            return returnWithError('Error during fetching, status:', res.statusCode);
        } else {
            var title = first ? `First result of ${query} starting from ${start}` : `First ${take} results of ${query} starting from ${start}`;
            var resLen = Object.keys(json.results).length,
                data;
            if (!resLen) data = {
                "embed": {
                    "color": 0xA260F6,
                    "title": title,
                    "url": url,
                    "descriptions": `Got 0 results, please try again!`,
                    "timestamp": new Date(),
                    "footer": {
                        "icon_url": `https://cdn.discordapp.com/avatars/${author.id}/${author.user.avatar}.webp?size=256`,
                        "text": `OEIS search by ${name} at ${moment().format('MMMM Do YYYY, hh:mm:ss')}`
                    }
                }
            };
            var shownResults = Object.keys(json.results).slice(0, first ? 1 : take);
            data = {
                "embed": {
                    "color": 0xA260F6,
                    "title": title,
                    "url": url,
                    "descriptions": `Got ${json.count} result${json.count!==1 ? 's' : ''}, showing ${resLen}:`,
                    "fields": shownResults.map(i => json.results[i]).map((r, i) => {
                        var oeisA = 'A' + r.number.toString().padStart(6, '0');
                        var title = `${oeisA} (https://oeis.org/${oeisA}): ${r.name}`;
                        if (title.length >= 256) title = title.slice(0, 250) + '...';
                        return {
                            "name": title,
                            "value": ['`' + r.data.replace(/,/g, ', ') + '`',
                                ...showFields.map(field => {
                                    let line = `**${field}**: `;
                                    if (Array.isArray(r[field])) {
                                        if (r[field].length > FIELD_SHOW_MAX) {
                                            line += r[field].slice(0, FIELD_SHOW_MAX).map(l => '\n  ' + l).join('');
                                            line += '\n' + `... ${r[field].length-FIELD_SHOW_MAX} item${r[field].length-FIELD_SHOW_MAX !== 1 ? 's' : ''} subsequent items hidden.`;
                                        } else line += '\n' + r[field].map(l => '  ' + l).join('\n');
                                    } else {
                                        line += r[field] !== undefined ? r[field] : 'None';
                                    }
                                    return line;
                                })
                            ].join('\n') + '\n '
                        }
                    }),
                    "timestamp": new Date(),
                    "footer": {
                        "icon_url": `https://cdn.discordapp.com/avatars/${author.id}/${author.user.avatar}.webp?size=256`,
                        "text": `OEIS search by ${name}`
                    }
                }
            };
            msg.channel.send('Results', data).catch(error => msg.channel.send('An error has okuu\'ed! The error was:\n \n' + `**${error.name}**\n${error.message}`));
        }
    });

}

module.exports = {
    searchSequence
};