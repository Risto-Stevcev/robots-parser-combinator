# robots-parser-combinator

[![Build Status](https://travis-ci.org/Risto-Stevcev/robots-parser-combinator.svg)](https://travis-ci.org/Risto-Stevcev/robots-parser-combinator)

A proper robots.txt parser and combinator that works with [eulalie](https://github.com/bodil/eulalie).


## Usage
```
User-agent: *
Allow: /blog/index.html  # site blog
Disallow: /cgi-bin/
Disallow: /tmp/
Sitemap: http://www.mysite.com/sitemaps/profiles-sitemap.xml  # extra profile urls
# save the robots
```


```javascript
> const parser = require('robots-parser-combinator')
> const robotstxt = fs.readFileSync('./robots.txt', 'utf8')
>
> var goodRobots = parser.parse(robotstxt)
[ { useragent: { value: '*' } },
  { allow: { value: '/blog/index.html', comment: 'site blog' } },
  { disallow: { value: '/cgi-bin/' } },
  { disallow: { value: '/tmp/' } },
  { sitemap:
     { value: 'http://www.mysite.com/sitemaps/profiles-sitemap.xml',
       comment: 'extra profile urls' } },
  'save the robots' ]

> var badRobots = parser.parse('')
[]
```

Or you can feed the `parser.robotstxt` combinator into eulalie to parse robots.txt.

You can also parse `robots.txt` containing nonstandard extensions like `Crawl-delay` or `Host` by using the `parser.parseNS` function. The combinators for nonstandard extensions are also provided.


## Implementation

The parser is an implementation of the BNF form for robots.txt based on the [Google spec](https://developers.google.com/webmasters/control-crawl-index/docs/robots_txt), and references  [RFC 1945](http://www.ietf.org/rfc/rfc1945.txt) and [RFC 1808](http://www.ietf.org/rfc/rfc1808.txt) when appropriate.

LWS (linear-white-space) is defined using the rule specified in [RFC 5234](http://www.ietf.org/rfc/rfc5234.txt), rather than RFC 1945. There is a small but very significant inconsistency between the rules:

RFC 5234 linear-white-space:
```
WSP  = SP / HTAB
LWSP = *(WSP / CRLF WSP)
```

RFC 1945 linear-white-space:
```
LWS = [CRLF] 1*( SP | HT )
```

The RFC 1945 linear-white-space rule consumes at least one `space` or `tab` character, and RFC 5234 does not. Due to this inconsistency, the parser has chosen the more general rule in order to be more flexible. You can set the parser to use the stricter rule by setting `parser.setStrictLWS(true)` before parsing.

All of the BNF rules in the robots.txt spec are provided as combinators. Since the combinators are compatible with eulalie, you can use them to get partial aspects of a robots.txt file or as part of a larger combinator.


## License
Licensed under the MIT license.
