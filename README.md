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
> const parse = require('robots-parser-combinator').parse
> const robotstxt = fs.readFileSync('./robots.txt', 'utf8')
>
> var goodRobots = parse(robotstxt)
[ { useragent: { value: '*' } },
  { allow: { value: '/blog/index.html', comment: 'site blog' } },
  { disallow: { value: '/cgi-bin/' } },
  { disallow: { value: '/tmp/' } },
  { sitemap:
     { value: 'http://www.mysite.com/sitemaps/profiles-sitemap.xml',
       comment: 'extra profile urls' } },
  'save the robots' ]

> var badRobots = parse('')
[]
```

Or you can feed the `require('robots-parser-combinator').robotstxt` combinator into eulalie to parse robots.txt.


## Implementation

The parser is an implementation of the BNF form for robots.txt based on the [Google spec](https://developers.google.com/webmasters/control-crawl-index/docs/robots_txt), and references  [RFC 1945](http://www.ietf.org/rfc/rfc1945.txt) and [RFC 1808](http://www.ietf.org/rfc/rfc1808.txt) when appropriate.

All of the BNF rules in the spec are provided to you as combinators, which means that you can use this library to get partial aspects of a robots.txt file. Since this is a eulalie compatible combinator, you can use it as part of larger combinator.


## License
Licensed under the MIT license.
