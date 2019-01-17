#!/usr/bin/env node
/*
 * index.js
 */

const fs = require('fs')
const path = require('path')
const util = require('util')
const exists = util.promisify(fs.exists)
const readFile = util.promisify(fs.readFile)
const readFileToString = f => readFile(f).then(b => b.toString())
const writeFile = util.promisify(fs.writeFile)
const realpath = util.promisify(fs.realpath)
const stat = util.promisify(fs.stat)
const program = require('commander')
const micromatch = require('micromatch')
const recursiveRead = require('recursive-readdir')

const generateTags = require('./generate-tags.js')

main()

function main() {
  const configFiles = [
    path.join(process.env.HOME, '.ctags'),
    path.join(process.env.HOME, '.ctags.d', 'excludes.ctags'),
  ]

  Promise.all(configFiles.map(readFileIfExists))
  .then(configs =>
    configs.filter(Boolean)
           .map(c => c.split(/\s+/))
           .reduce((acc, cur) => acc.concat(cur), []))
  .then(configs => {

    const argv =
      process.argv.slice(0, 2).concat(
        configs.concat(process.argv.slice(2))
      )

    program
      .version('1.0.0')
      .usage('[options] <files ...>')
      .option('-f <file>', 'Tagfile ("-" for stdout)')
      .option('-R, --recurse', 'Search in sub-directories')
      .option('-a, --absolute', 'Use absolute paths')
      .option('-k, --keepAll', 'By default, add *.scss to the exclude patterns. This prevents that.')
      .option('    --exclude [pattern]', 'A repeatable value', collect, [])
      .parse(argv)

    const recurse = program.recurse
    const relative = program.absolute ? false : true
    const keepAll = program.keepAll
    const includes = keepAll ? undefined : ['*.scss']
    const excludes = program.exclude.concat()
    const files = program.args
    const output = program.F || 'tags'

    const options = { excludes, includes, recurse }

    if (files.length === 0) {
      program.help(text => text + '\nMissing input files\n')
    }

    // console.log(program)
    // console.log({ argv, files, excludes, recurse, keepAll, relative })

    collectFiles(files, options)
    .then(filepaths => {
      // console.log(filepaths)
      return Promise.all(
        filepaths.map(f => generateTags(f, { relative }))
      )
      .then(flatten)
    })
    .then(lines => lines.join('\n'))
    .then(result => {
      if (output === '-' || output === '--')
        return console.log(result)

      return writeFile(output, result)
    })
  })
}



/*
 * Helpers
 */

function collectFiles(files, options) {
  return Promise.all(files.map(f => realpath(f)))
  .then(filepaths => filepaths.filter(f => !isExcluded(f, options)))
  .then(filepaths => {
    if (options.recurse) {
      return Promise.all(filepaths.map(filepath =>
        stat(filepath)
        .then(s => {
          if (s.isDirectory()) {
            return recursiveRead(filepath, [(f, s) => isExcluded(f, options)])
          }
          return [filepath]
        })
      ))
      .then(results => flatten(results))
    }
    return filepaths
  })
  .then(filepaths => options.includes ? filepaths.filter(f => isIncluded(f, options)) : filepaths)
}

function isExcluded(filepath, options) {
  const filename = path.basename(filepath)

  if (micromatch.some(filepath, options.excludes)
   || micromatch.some(filename, options.excludes)) {
    return true
  }

  return false
}

function isIncluded(filepath, options) {
  const filename = path.basename(filepath)

  if (!(micromatch.some(filepath, options.includes)
     || micromatch.some(filename, options.includes))) {
    return false
  }

  return true
}

function collect(val, memo) {
  memo.push(val);
  return memo;
}

function readFileIfExists(filepath) {
  return exists(filepath).then(yes => yes ? readFileToString(filepath) : undefined)
}

function flatten(array) {
  return array.reduce((acc, cur) => acc.concat(cur), [])
}
