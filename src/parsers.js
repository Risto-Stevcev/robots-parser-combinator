'use strict'
require('babel-polyfill')
const p = require('eulalie')

const path        = require('url-parser-combinator').path
    , net_loc     = require('url-parser-combinator').net_loc
    , absoluteURI = require('url-parser-combinator').absoluteURL

/* https://developers.google.com/webmasters/control-crawl-index/docs/robots_txt
 * http://www.ietf.org/rfc/rfc5234.txt
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

var LWSWS;
let LWSrule = {
  strict:   p.many1(p.either([p.char(' '), p.char('\t')])),
  flexible: p.many(p.either([p.char(' '), p.char('\t')])),
}

let setStrictLWS = setStrict => setStrict ? (LWSWS = LWSrule.strict) : (LWSWS = LWSrule.flexible)
setStrictLWS(false)

let EOL       = p.either([p.string('\r\n'), p.char('\r'), p.char('\n')])
  , LWS       = p.seq(function*() {
                  return (yield p.maybe(EOL)).value
                       + (yield LWSWS).value
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

                        let commentValue = (yield p.maybe(comment)).value

                        if (line && commentValue)
                          (line.sitemap || line.othernongroupfield).comment = commentValue

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

                        let commentValue = (yield p.maybe(comment)).value

                        if (line && commentValue)
                          (line[field] || line.othermemberfield).comment = commentValue

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
                        let commentValue = (yield p.maybe(comment)).value
                        if (commentValue)
                          result.useragent.comment = commentValue
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

/* Nonstandard directives */
// crawldelayline = [LWS] "crawl-delay" [LWS] ":" [LWS] float [comment] EOL
let crawldelayline = p.seq(function*() {
                       let result = {}
                       yield p.maybe(LWS)
                       yield p.either([p.string('crawl-delay'), p.string('Crawl-delay')])
                       yield p.maybe(LWS)
                       yield p.char(':')
                       yield p.maybe(LWS)
                       result.value = (yield p.float).value

                       if (result.value < 0)
                         yield p.fail

                       let commentValue = (yield p.maybe(comment)).value
                       if (commentValue)
                         result.comment = commentValue

                       yield EOL
                       return { crawldelay: result }
                     })

// hostline = [LWS] "host" [LWS] ":" [LWS] net_loc [comment] EOL
let hostline = p.seq(function*() {
                 let result = {}
                 yield p.maybe(LWS)
                 yield p.either([p.string('host'), p.string('Host')])
                 yield p.maybe(LWS)
                 yield p.char(':')
                 yield p.maybe(LWS)
                 result.value = (yield net_loc).value

                 if (result.value && !result.value.length)
                   yield p.fail

                 let commentValue = (yield p.maybe(comment)).value
                 if (commentValue)
                   result.comment = commentValue

                 yield EOL
                 return { host: result }
               })

// *( ( <1>*startgroupline *(groupmemberline | nongroupline | crawldelayline | hostline | comment) | nongroupline | comment) )
let entriesNS   = p.manyA(p.either([
                    p.seq(function*() {
                      let useragentLines = (yield p.many1A(startgroupline)).value
                      let lines = (yield p.manyA(p.either([groupmemberline, nongroupline, crawldelayline, hostline, comment]))).value
                      return useragentLines.concat(lines)
                    }),
                    nongroupline,
                    comment
                  ]))
  , robotstxtNS = p.seq(function*() {
                    yield p.maybe(BOM)
                    return (yield entriesNS).value
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

let parse   = string => [].concat.apply([], p.parse(seqEOF(robotstxt,   true), p.stream(string)).value || [])  // flatten
  , parseNS = string => [].concat.apply([], p.parse(seqEOF(robotstxtNS, true), p.stream(string)).value || [])  // flatten


module.exports = {
  isCTL:       isCTL,
  isBOM:       isBOM,
  isAnychar:   isAnychar,
  isValuechar: isValuechar,

  setStrictLWS: setStrictLWS,

  seqEOF:  seqEOF,
  parse:   parse,

  parseNS:        parseNS,
  entriesNS:      entriesNS,
  robotstxtNS:    robotstxtNS,
  crawldelayline: crawldelayline,
  hostline:       hostline,

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
  BOM: BOM
}
