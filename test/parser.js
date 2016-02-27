'use strict'
const expect = require('chai').expect
    , path   = require('path')
    , fs     = require('fs')

const parse = require('../index').parse

const expected  = require('./expected.json')
const robotstxt = fs.readFileSync(path.resolve('.', `${__dirname}/robots.txt`), 'utf8')


describe('Parser', () => {
  it('should parse the sample robots.txt', () => {
    expect(parse(robotstxt)).to.deep.equal(expected)
    expect(parse('\uFEFF'+robotstxt)).to.deep.equal(expected)
  })
})
