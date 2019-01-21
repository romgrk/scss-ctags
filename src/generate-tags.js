/*
 * generate-tags.js
 */


const fs = require('fs')
const path = require('path')
const util = require('util')
const readFile = util.promisify(fs.readFile)
const readFileToString = f => readFile(f).then(b => b.toString())
const realpath = util.promisify(fs.realpath)
const { parse, stringify } = require('scss-parser')

util.inspect.defaultOptions = {
  breakLength: 120,
  depth: 4,
} 

module.exports = generateTags

/*
 * Definitions
 */

/**
 * @typedef Tag
 * @type {Object}
 * @property {string} type
 * @property {Object} node
 * @property {Object[]} parents
 * @property {string} filename
 */

/**
 * Kind character by name
 * @type {Object}
 */
const kinds = {
  'variable': 'v',
  'mixin':    'm',
  'function': 'f',
  'rule':     'r',
}


/*
 * Functions
 */

function generateTags(filename, options) {
  return getPath(filename, { relative: options.relative })
  .then(filepath =>
    readFileToString(filepath)
    .then(content => parseFile(filepath, content))
  )
  .then(tags => tags.map(tagToString))
}

/**
 * @param {string} filename
 * @param {string} content
 * @return {Tag[]}
 */
function parseFile(filename, content) {
  const tags = []

  let ast = parse(content)

  traverse(ast, (node, parent, parents) => {
    if (node.type === 'declaration') {
      const variable = getChild(node, 'property', 'variable')
      if (variable !== undefined)
        tags.push({ type: 'variable', node, parents, filename })
    }

    if (node.type === 'atrule' && node.value[0].value === 'mixin') {
      const identifier = getChild(node, 'identifier')
      if (identifier !== undefined)
        tags.push({ type: 'mixin', node, parents, filename })
    }

    if (node.type === 'atrule' && node.value[0].value === 'function') {
      const identifier = getChild(node, 'identifier')
      if (identifier !== undefined)
        tags.push({ type: 'function', node, parents, filename })
    }

    if (node.type === 'rule') {
      tags.push({ type: 'rule', node, parents, filename })
    }
  })

  return tags
}

/**
 * @param {Tag} tag
 * @returns {string}
 */
function tagToString(tag) {
  const {type, node, parents, filename} = tag
  switch (type) {
    case 'variable': {
      /* const parentRules =
       *   parents
       *   .filter(p => p.type !== 'stylesheet' && p.type !== 'block')
       *   .map(getRuleText) */

      const variable = getChild(node, 'property', 'variable')
      const text = getValue(variable)
      const line = variable.start.line
      const letter = kinds['variable']
      // console.log(['variable', text, line])
      return `${text}\t${filename}\t${line};"\t${letter}`
    }
    case 'mixin': {
      const identifier = getChild(node, 'identifier')
      const text = getValue(identifier)
      const line = identifier.start.line
      const letter = kinds['mixin']
      // console.log(['mixin', text, line])
      return `${text}\t${filename}\t${line};"\t${letter}`
    }
    case 'function': {
      const identifier = getChild(node, 'identifier')
      const text = getValue(identifier)
      const line = identifier.start.line
      const letter = kinds['function']
      // console.log(['function', text, line])
      return `${text}\t${filename}\t${line};"\t${letter}`
    }
    case 'rule': {
      const parentRules =
        parents
        .filter(p => p.type !== 'stylesheet' && p.type !== 'block')
        .map(getRuleText)

      const text = parentRules.concat(getRuleText(node)).join(' ')
      const line = node.start.line
      const letter = kinds['rule']
      // console.log(['rule', text, line])
      return `${text}\t${filename}\t${line};"\t${letter}`
    }
    default:
      throw new Error('unreachable')
  }
}

function getRuleText(rule) {
  if (rule.type === 'atrule') {
    return '@media ' + stringify(rule.value[2])
  }
  return rule.value[0].value.map(getValue).join('').trim().replace(/\s+/g, ' ')
}

function getValue(node) {
  switch (node.type) {
    case 'punctuation':
    case 'space':
    case 'identifier':
    case 'operator':
    case 'number':
      return node.value

    case 'pseudo_class':
      return ':' + toString(node)

    case 'function': {
      const name = node.value[0].value[0].value
      const args = node.value[1].value.map(getValue).join('')
      return `:${name}(${args})`
    }

    case 'attribute':
      return '[' + node.value.map(getValue).join('') + ']'

    case 'id':
      return '#' + node.value.map(getValue).join('')

    case 'class':
      return '.' + node.value.map(getValue).join('')

    case 'variable':
      return '$' + node.value

    default:
      console.warn('Unexpected node', [node.type, node.value])
      return node.value
  }
}

function toString(node) {
  if (typeof node.value === 'string')
    return node.value
  if (Array.isArray(node.value))
    return node.value.map(toString).join('')
  throw new Error(`unexpected node: ${node.type}: ${node.value}`)
}

function traverse(node, fn, parent = null, parents = []) {
  if (parent !== null)
    fn(node, parent, parents)

  if (Array.isArray(node.value)) {
    const nextParents = parents.concat(node)
    node.value.forEach(v => {
      traverse(v, fn, node, nextParents)
    })
  }
}

function getChild(node, ...types) {
  let current = node
  let type
  while ((type = types.shift())) {
    if (current === undefined)
      return current
    current = current.value.find(n => n.type === type)
  }
  return current
}

/*
 * Helpers
 */

function getPath(filename, options = { relative: true }) {
  return realpath(filename).then(filepath => options.relative ?
    path.relative(process.cwd(), filepath) :
    filepath)
}
