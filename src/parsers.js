'use strict'
require('babel-polyfill')
const p = require('eulalie')

const path        = require('url-parser-combinator').path
    , absoluteURI = require('url-parser-combinator').absoluteURL

/* https://developers.google.com/webmasters/control-crawl-index/docs/robots_txt
robotstxt = *entries  // typo: *entries should be entries since * is repeated in entries rule
entries = *( ( <1>*startgroupline 
  *(groupmemberline | nongroupline | comment)
  | nongroupline
  | comment) )
startgroupline = [LWS] "user-agent" [LWS] ":" [LWS] agentvalue [comment] EOL
groupmemberline = [LWS] (
  pathmemberfield [LWS] ":" [LWS] pathvalue
  | othermemberfield [LWS] ":" [LWS] textvalue) [comment] EOL
nongroupline = [LWS] (
  urlnongroupfield [LWS] ":" [LWS] urlvalue
  | othernongroupfield [LWS] ":" [LWS] textvalue) [comment] EOL
comment = [LWS] "#" *anychar
agentvalue = textvalue

pathmemberfield = "disallow" | "allow"
othermemberfield = ()
urlnongroupfield = "sitemap"
othernongroupfield = ()

pathvalue = "/" path
urlvalue = absoluteURI
textvalue = *(valuechar | SP)
valuechar = <any UTF-8 character except ("#" CTL)>
anychar = <any UTF-8 character except CTL>
EOL = CR | LF | (CR LF)
 */

let isCTL       = c => /^[\u0000-\u001F\u007F]$/.test(c)
  , isBOM       = c => /^[\uFEFF]$/.test(c)
  , isAnychar   = c => /^.$/.test(c) && !isCTL(c)
  , isValuechar = c => /^.$/.test(c) && !(isCTL(c) || /^#$/.test(c))

let EOL       = p.either([p.string('\r\n'), p.char('\r'), p.char('\n')])
  , LWS       = p.seq(function*() {
                  return (yield p.maybe(EOL)).value
                       + (yield p.many1(p.either([p.char(' '), p.char('\t')]))).value
                })
  , BOM       = p.sat(isBOM)
  , anychar   = p.sat(isAnychar)
  , valuechar = p.sat(isValuechar)
  , textvalue = p.many(p.either([valuechar, p.char(' ')]))
  , urlvalue  = absoluteURI
  , pathvalue = p.seq(function*() {
                  return (yield p.char('/')).value
                       + (yield path).value
                })

let othernongroupfield = p.unit('')
  , urlnongroupfield   = p.either([p.string('sitemap'), p.string('Sitemap')])
  , othermemberfield   = p.unit('')
  , pathmemberfield    = p.either([p.string('disallow'), p.string('allow'), p.string('Disallow'), p.string('Allow')])

let agentvalue      = textvalue
  , comment         = p.seq(function*() {
                        yield p.maybe(LWS)
                        yield p.char('#')
                        return (yield p.many(anychar)).value.trim()
                      })
  , nongroupline    = p.seq(function*() {
                        yield p.maybe(LWS)
                        let line = (yield p.either([
                          p.seq(function*() {
                            yield urlnongroupfield
                            yield p.maybe(LWS)
                            yield p.char(':')
                            yield p.maybe(LWS)
                            return { sitemap: { value: (yield urlvalue).value } }
                          }),
                          p.seq(function*() {
                            yield othernongroupfield
                            yield p.maybe(LWS)
                            yield p.char(':')
                            yield p.maybe(LWS)
                            return { othernongroupfield: { value: (yield textvalue).value } }
                          })
                        ])).value

                        if (line)
                          (line.sitemap || line.othernongroupfield).comment = (yield p.maybe(comment)).value

                        yield EOL
                        return line
                      })
  , groupmemberline = p.seq(function*() {
                        yield p.maybe(LWS)
                        let field;
                        let line = (yield p.either([
                          p.seq(function*() {
                            let result  = {}
                            field = (yield pathmemberfield).value.toLowerCase()
                            yield p.maybe(LWS)
                            yield p.char(':')
                            yield p.maybe(LWS)
                            result[field] = { value: (yield pathvalue).value }
                            return result
                          }),
                          p.seq(function*() {
                            yield othermemberfield
                            yield p.maybe(LWS)
                            yield p.char(':')
                            yield p.maybe(LWS)
                            return { othermemberfield: { value: (yield textvalue).value } }
                          })
                        ])).value

                        if (line)
                          (line[field] || line.othermemberfield).comment = (yield p.maybe(comment)).value

                        yield EOL
                        return line
                      })
  , startgroupline  = p.seq(function*() {
                        let result = { useragent: {} }
                        yield p.maybe(LWS)
                        yield p.either([p.string('user-agent'), p.string('User-agent')])
                        yield p.maybe(LWS)
                        yield p.char(':')
                        yield p.maybe(LWS)
                        result.useragent.value   = (yield agentvalue).value
                        result.useragent.comment = (yield p.maybe(comment)).value
                        yield EOL
                        return result
                      })
  , entries         = p.manyA(p.either([
                        p.seq(function*() {
                          let useragentLines = (yield p.many1A(startgroupline)).value
                          let lines = (yield p.manyA(p.either([groupmemberline, nongroupline, comment]))).value
                          return useragentLines.concat(lines) 
                        }),
                        nongroupline,
                        comment
                      ]))
  , robotstxt       = p.seq(function*() {
                        yield p.maybe(BOM)
                        return (yield entries).value
                      })


let seqEOF = function(parser, parseTailingSpaces) {
  return p.seq(function*() {
    const value = (yield parser).value

    if (parseTailingSpaces)
      yield p.many(p.space)

    yield p.eof
    return value
  })
}

let parse = string => p.parse(seqEOF(robotstxt, true), p.stream(string)).value || []



module.exports = {
  isCTL:       isCTL,
  isBOM:       isBOM,
  isAnychar:   isAnychar,
  isValuechar: isValuechar,

  parse:           parse,

  robotstxt:       robotstxt,
  entries:         entries,
  startgroupline:  startgroupline,
  groupmemberline: groupmemberline,
  nongroupline:    nongroupline,
  comment:         comment,
  agentvalue:      agentvalue,

  pathmemberfield:    pathmemberfield,
  othermemberfield:   othermemberfield,
  urlnongroupfield:   urlnongroupfield,
  othernongroupfield: othernongroupfield,

  pathvalue: pathvalue,
  urlvalue:  urlvalue,
  textvalue: textvalue,
  valuechar: valuechar,
  anychar:   anychar,

  EOL: EOL,
  LWS: LWS,
  BOM: BOM,

  seqEOF: seqEOF
}
