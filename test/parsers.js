'use strict'
require('babel-polyfill')
const expect = require('chai').expect
    , path   = require('path')
    , fs     = require('fs')
    , p      = require('eulalie')

const s = require('../src/parsers')

const expected  = require('./expected.json')
const robotstxt = fs.readFileSync(path.resolve('.', `${__dirname}/robots.txt`), 'utf8')


describe('Predicates', () => {
  describe('isCTL', () => {
    it('should match the correct chars', () => {
      ['\u0000','\u0010','\u001F','\u007F'].forEach(string => expect(s.isCTL(string)).to.be.true)
    })

    it('should not match incorrect chars', () => {
      ['\u0020','\u0080','a','A','z','Z','#'].forEach(string => expect(s.isCTL(string)).to.be.false)
    })
  })

  describe('isBOM', () => {
    it('should match the correct chars', () => {
      expect(s.isBOM('\uFEFF')).to.be.true
    })

    it('should not match incorrect chars', () => {
      ['\u0000','\u001F','a','A','z','Z','#'].forEach(string => expect(s.isBOM(string)).to.be.false)
    })
  })

  describe('isAnyChar', () => {
    it('should match the correct chars', () => {
      ['\u0020','\u0080','a','A','z','Z','#'].forEach(string => expect(s.isAnychar(string)).to.be.true)
    })

    it('should not match incorrect chars', () => {
      ['\u0000','\u0010','\u001F','\u007F','\r','\n'].forEach(string => expect(s.isAnychar(string)).to.be.false)
    })
  })

  describe('isValueChar', () => {
    it('should match the correct chars', () => {
      ['\u0020','\u0080','a','A','z','Z'].forEach(string => expect(s.isValuechar(string)).to.be.true)
    })

    it('should not match incorrect chars', () => {
      ['\u0000','\u0010','\u001F','\u007F','#','\r','\n'].forEach(string => expect(s.isValuechar(string)).to.be.false)
    })
  })
})



describe('Parsers', () => {
  describe('EOL', () => {
    it('should parse text', () => {
      expect(p.parse(s.EOL, p.stream('\r'))).to.have.property('value', '\r')
      expect(p.parse(s.EOL, p.stream('\n'))).to.have.property('value', '\n')
      expect(p.parse(s.seqEOF(s.EOL), p.stream('\r\n'))).to.have.property('value', '\r\n')
    })

    it('should fail to parse text', () => {
      expect(p.parse(s.EOL, p.stream(''))).to.be.instanceof(Error)
    })
  })

  describe('LWS', () => {
    it('should parse text', () => {
      expect(p.parse(s.seqEOF(s.LWS), p.stream('\n '))).to.have.property('value', '\n ')
    })

    it('should fail to parse text', () => {
      expect(p.parse(s.LWS, p.stream(''))).to.be.instanceof(Error)
      expect(p.parse(s.LWS, p.stream('\n'))).to.be.instanceof(Error)
    })
  })

  describe('BOM', () => {
    it('should parse text', () => {
      expect(p.parse(s.BOM, p.stream('\uFEFF'))).to.have.property('value', '\uFEFF')
    })

    it('should fail to parse text', () => {
      expect(p.parse(s.BOM, p.stream(''))).to.be.instanceof(Error)
    })
  })

  describe('anychar', () => {
    it('should parse text', () => {
      ['\u0020','\u0080','a','A','z','Z','#']
        .forEach(string => expect(p.parse(s.anychar, p.stream(string))).to.have.property('value', string))
    })

    it('should fail to parse text', () => {
      ['\u0000','\u0010','\u001F','\u007F','\n']
        .forEach(string => expect(p.parse(s.anychar, p.stream(string))).to.be.instanceof(Error))
    })
  })

  describe('valuechar', () => {
    it('should parse text', () => {
      ['\u0020','\u0080','a','A','z','Z']
        .forEach(string => expect(p.parse(s.valuechar, p.stream(string))).to.have.property('value', string))
    })

    it('should fail to parse text', () => {
      ['\u0000','\u0010','\u001F','\u007F','#','\r','\n']
        .forEach(string => expect(p.parse(s.valuechar, p.stream(string))).to.be.instanceof(Error))
    })
  })

  describe('textvalue', () => {
    it('should parse text', () => {
      let string = 'azAZ09\'"<>;:\\/[]!@$%^&*()'
      expect(p.parse(s.textvalue, p.stream(string))).to.have.property('value', string)
    })

    it('should fail to parse text', () => {
      ['azAZ09\'"<>;:\\/[]!@$%^&*()\n'
      ,'azAZ09\'"<>;:\\/[]!@$%^&*()' + '#\u007F'
      ].forEach(string => expect(p.parse(s.seqEOF(s.textvalue), p.stream(string))).to.be.instanceof(Error))
    })
  })

  describe('pathvalue', () => {
    it('should parse text', () => {
      let string = '/foo/bar'
      expect(p.parse(s.pathvalue, p.stream(string))).to.have.property('value', string)
    })

    it('should fail to parse text', () => {
      let string = 'foo/bar'
      expect(p.parse(s.seqEOF(s.pathvalue), p.stream(string))).to.be.instanceof(Error)
    })
  })

  describe('urlnongroupfield', () => {
    it('should parse text', () => {
      expect(p.parse(s.urlnongroupfield, p.stream('sitemap'))).to.have.property('value', 'sitemap')
    })

    it('should fail to parse text', () => {
      expect(p.parse(s.seqEOF(s.urlnongroupfield), p.stream('sitemaps'))).to.be.instanceof(Error)
    })
  })

  describe('pathmemberfield', () => {
    it('should parse text', () => {
      expect(p.parse(s.pathmemberfield, p.stream('allow'))).to.have.property('value', 'allow')
      expect(p.parse(s.pathmemberfield, p.stream('disallow'))).to.have.property('value', 'disallow')
    })

    it('should fail to parse text', () => {
      expect(p.parse(s.seqEOF(s.pathmemberfield), p.stream('allows'))).to.be.instanceof(Error)
      expect(p.parse(s.seqEOF(s.pathmemberfield), p.stream('disallows'))).to.be.instanceof(Error)
    })
  })

  describe('agentvalue', () => {
    it('should be an alias for textvalue', () => {
      expect(s.agentvalue).to.equal(s.textvalue)
    })
  })

  describe('comment', () => {
    it('should parse text', () => {
      ['#s0me comment!'
      ,'\n \t#s0me comment!'
      ,'\r\n\t\t#  s0me comment!'
      ].forEach(string => expect(p.parse(s.comment, p.stream(string))).to.have.property('value', string.replace('#','').trim()))
    })

    it('should fail to parse text', () => {
      ['s0me comment!'
      ,' \t#s0me comment\u007F!'
      ].forEach(string => expect(p.parse(s.seqEOF(s.comment), p.stream(string))).to.be.instanceof(Error))
    })
  })

  describe('nongroupline', () => {
    it('should parse text', () => {
      let string = 'http://localhost:80/static/sitemap.xml'
      expect(p.parse(s.nongroupline, p.stream(`sitemap: ${string}\n`)).value).to.deep.equal({ sitemap: { value: string, comment: ''} })
      expect(p.parse(s.nongroupline, p.stream(`sitemap: ${string} #h3y!\n`)).value).to.deep.equal({ sitemap: { value: string, comment: 'h3y!'} })
      expect(p.parse(s.nongroupline, p.stream(`: f00\n`)).value).to.deep.equal({ othernongroupfield: { value: 'f00', comment: ''} })
      expect(p.parse(s.nongroupline, p.stream(`: bar #h3y!\n`)).value).to.deep.equal({ othernongroupfield: { value: 'bar ', comment: 'h3y!'} })
    })

    it('should fail to parse text', () => {
      ['sitemap: '
      ,': bar'
      ,'allow: http://localhost:80/static/sitemap.xml\n'
      ,'sitemap: http://localhost:80/static/sitemap.xml'
      ].forEach(string => expect(p.parse(s.seqEOF(s.nongroupline), p.stream(string))).to.be.instanceof(Error))
    })
  })

  describe('groupmemberline', () => {
    it('should parse text', () => {
      let string = '/static/*.js'
      expect(p.parse(s.groupmemberline, p.stream(`allow: ${string}\n`)).value).to.deep.equal({ allow: { value: string, comment: ''} })
      expect(p.parse(s.groupmemberline, p.stream(`allow: ${string} #h3y!\n`)).value).to.deep.equal({ allow: { value: string, comment: 'h3y!'} })
      expect(p.parse(s.groupmemberline, p.stream(`disallow: ${string}\n`)).value).to.deep.equal({ disallow: { value: string, comment: ''} })
      expect(p.parse(s.groupmemberline, p.stream(`disallow: ${string} #h3y!\n`)).value).to.deep.equal({ disallow: { value: string, comment: 'h3y!'} })
      expect(p.parse(s.groupmemberline, p.stream(`: foo\n`)).value).to.deep.equal({ othermemberfield: { value: 'foo', comment: ''} })
      expect(p.parse(s.groupmemberline, p.stream(`: bar #h3y!\n`)).value).to.deep.equal({ othermemberfield: { value: 'bar ', comment: 'h3y!'} })
    })

    it('should fail to parse text', () => {
      ['sitemap: '
      ,': bar'
      ,'allow: '
      ,'allow: /static/sitemap.xml'
      ,'allow: http://localhost:80/static/sitemap.xml'
      ,'sitemap: /static/sitemap.xml\n'
      ].forEach(string => expect(p.parse(s.seqEOF(s.groupmemberline), p.stream(string))).to.be.instanceof(Error))
    })
  })

  describe('startgroupline', () => {
    it('should parse text', () => {
      expect(p.parse(s.startgroupline, p.stream(`user-agent: curl\n`)).value).to.deep.equal({ useragent: { value: 'curl', comment: ''} })
      expect(p.parse(s.startgroupline, p.stream(`user-agent: curl\n`)).value).to.deep.equal({ useragent: { value: 'curl', comment: ''} })
    })

    it('should fail to parse text', () => {
      ['user-agent: '
      ,'user-agent: curl'
      ,'allow: /static/sitemap.xml\n'
      ,'sitemap: http://localhost:80/static/sitemap.xml\n'
      ].forEach(string => expect(p.parse(s.seqEOF(s.startgroupline), p.stream(string))).to.be.instanceof(Error))
    })
  })

  describe('entries', () => {
    it('should parse text', () => {
      expect(p.parse(s.entries, p.stream(robotstxt)).value).to.deep.equal(expected)
      expect(p.parse(s.entries, p.stream(robotstxt.toLowerCase())).value).to.deep.equal(expected)
    })

    it('should fail to parse text', () => {
      expect(p.parse(s.seqEOF(s.entries), p.stream('\uFEFF'+robotstxt))).to.be.instanceof(Error)
      expect(p.parse(s.seqEOF(s.entries), p.stream(robotstxt.toUpperCase()))).to.be.instanceof(Error)
    })
  })

  describe('robotstxt', () => {
    it('should parse text', () => {
      expect(p.parse(s.seqEOF(s.robotstxt, true), p.stream('\uFEFF'+robotstxt)).value).to.deep.equal(expected)
    })
  })
})
