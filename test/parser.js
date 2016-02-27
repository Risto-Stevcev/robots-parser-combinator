'use strict'
const expect = require('chai').expect
    , path   = require('path')
    , fs     = require('fs')

const parse   = require('../index').parse
    , parseNS = require('../index').parseNS

const expected    = require('./expected.json')
const expectedNS  = require('./expected.ns.json')
const robotstxt   = fs.readFileSync(path.resolve('.', `${__dirname}/robots.txt`),    'utf8')
const robotstxtNS = fs.readFileSync(path.resolve('.', `${__dirname}/robots.ns.txt`), 'utf8')


describe('Parser', () => {
  it('should parse the sample robots.txt', () => {
    expect(parse(robotstxt)).to.deep.equal(expected)
    expect(parse('\uFEFF'+robotstxt)).to.deep.equal(expected)
  })

  it('should fail to parse a bad robots.txt', () => {
    expect(parse('')).to.be.empty
  })
})

describe('Nonstandard Parser', () => {
  it('should parse the sample robots.ns.txt', () => {
    expect(parseNS(robotstxtNS)).to.deep.equal(expectedNS)
    expect(parseNS('\uFEFF'+robotstxtNS)).to.deep.equal(expectedNS)
  })

  it('should fail to parse a bad robots.txt', () => {
    expect(parse('')).to.be.empty
  })
})
