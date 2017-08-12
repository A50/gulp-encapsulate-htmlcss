'use strict';
const gutil = require('gulp-util');
const through = require('through2');
const postcss = require('postcss');
const path = require('path');
const shortid = require('shortid');
const PluginError = gutil.PluginError;
const PLUGIN_NAME = 'gulp-encapsulate-htmlcss';


module.exports = (options) => {
    var _file;
    var components = {};

    function html(file, componentName, hash) {

        var regex = new RegExp(/<([a-z0-9]*)([^>\/ !]+)/g);
        var m;
        var tags = {};
        let data = file.contents.toString()
            .split('\n')
            .map((line) => line.replace(/\r\n|\r|\n|\t/g, ''))
            .join('');
        while ((m = regex.exec(data)) !== null) {
            if (m.index == regex.lastIndex) {
                regex.lastIndex++;
            }
            tags[data.substring(m.index, regex.lastIndex)] = data.substring(m.index, regex.lastIndex);
        }
        for (const tag in tags) {
            if (tags.hasOwnProperty(tag)) {
                var element = tags[tag];
                data = data.replace(new RegExp(element + ' ', 'g'), `${element} _${componentName}-${hash} `);
                data = data.replace(new RegExp(element + '>', 'g'), `${element} _${componentName}-${hash} >`);
            }
        };
        file.contents = new Buffer(data);
        return file;
    }

    function css(file, componentName, hash) {
        let data = file.contents.toString()
        var t = postcss.parse(data);
        t.walkRules((rule) => {
            var str = rule.selector;
            str = str.replace(/ /g, `[_${componentName}-${hash}] `);
            if (!str.match(/:([a-zA-Z-\(\)0-9]+$)/)) {
                str = `${str}[_${componentName}-${hash}]`;
            }
            rule.selector = str
            rule.selector = rule.selector.replace(/:/g, `[_${componentName}-${hash}]:`);
        })
        file.contents = new Buffer(t.toString());
        return file;
    }
    return through.obj(function(file, enc, cb) {
        if (file.isNull()) {
            cb(null, file);
            return;
        }

        if (file.isStream()) {
            cb(new gutil.PluginError(PLUGIN_NAME, 'Streaming not supported'));
            return;
        }

        try {

            let componentName = path.dirname(file.path).split(path.sep).pop();
            if (!components[componentName]) {
                let hash = shortid.generate().toLowerCase();
                components[componentName] = hash;
            }
            if (/\.[^\.]*$/.exec(file.path)[0] === '.css') {
                _file = css(file, componentName, components[componentName]);
            }
            if (/\.[^\.]*$/.exec(file.path)[0] === '.html') {
                _file = html(file, componentName, components[componentName]);
            }
            this.push(_file);
        } catch (err) {
            this.emit('error', new PluginError(PLUGIN_NAME, err));
        }
        this.push(_file);
        cb();
    });
};