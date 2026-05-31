export interface ParameterInfo {
  label: string;
  documentation: string;
}

export interface DirectiveInfo {
  example: string;
  usage: string;
  description: string;
  details: string[];
  reference?: {
    text: string;
    url: string;
  }[];
  params: ParameterInfo[];
  hiddenCompletion?: boolean;
}

export const DIRECTIVE_INFOS: Record<string, DirectiveInfo> = {
  "user-agent": {
    example: "User-agent: ExampleBot",
    usage: "User-agent: <product-token>",
    description: "Specifies which crawler the following rule group applies to.",
    details: [
      "The value is a crawler name (product token) or `*` for all crawlers.",
      "Matching is case-insensitive and based on the user-agent product token.",
      "Multiple consecutive `User-agent` lines share the same rule group.",
    ],
    params: [
      {
        label: "<product-token>",
        documentation: "The name of the crawler to target.",
      },
    ],
  },

  disallow: {
    example: "Disallow: /command/*.php$",
    usage: "Disallow: <path-pattern>",
    description:
      "Specifies path patterns that are disallowed for matching crawlers.",
    details: [
      "The value is a path beginning with `/`.",
      "When multiple rules match, the longest match is used.",
      "`*` matches any number of characters and `$` matches the end of the path.",
      "An empty value allows all paths.",
      "Robots.txt is advisory and should not be relied on for access control.",
    ],
    params: [
      {
        label: "<path-pattern>",
        documentation: "The path pattern that should not be crawled.",
      },
    ],
  },

  allow: {
    example: "Allow: /articles/",
    usage: "Allow: <path-pattern>",
    description:
      "Specifies path patterns that are allowed for matching crawlers.",
    details: [
      "The value is a path beginning with `/`.",
      "When multiple rules match, the longest match is used.",
      "`*` matches any number of characters and `$` matches the end of the path.",
      "`Allow` rules can override broader `Disallow` rules.",
    ],
    params: [
      {
        label: "<path-pattern>",
        documentation: "The path pattern that can be crawled.",
      },
    ],
  },

  sitemap: {
    example: "Sitemap: https://www.example.com/sitemap.xml",
    usage: "Sitemap: <sitemap-url>",
    description: "Specifies the location of a sitemap file.",
    details: [
      "The value must be an absolute URL.",
      "Applies globally and is not part of any User-agent group.",
      "Multiple `Sitemap` directives may be specified.",
    ],
    reference: [
      {
        text: "Sitemap Protocol - Sitemaps.org",
        url: "https://www.sitemaps.org/protocol.html",
      },
    ],
    params: [
      {
        label: "<sitemap-url>",
        documentation: "The sitemap file URL.",
      },
    ],
  },

  "crawl-delay": {
    example: "Crawl-delay: 10",
    usage: "Crawl-delay: <seconds>",
    description: "Specifies the minimum delay between crawler requests.",
    details: [
      "The value is expressed in seconds.",
      "Applies to the current User-agent group.",
      "This directive is non-standard and may be ignored by some crawlers.",
    ],
    params: [
      {
        label: "<seconds>",
        documentation:
          "The number of seconds to wait between crawler requests.",
      },
    ],
  },

  "clean-param": {
    example: "Clean-param: sessionid&ref /articles/",
    usage: "Clean-param: <params> [<path-pattern>]",
    description:
      "Specifies URL query parameters that do not affect page content.",
    details: [
      "Multiple parameter names may be separated by `&`.",
      "An optional path pattern may be specified to limit the rule.",
      "Applies globally and is not part of any User-agent group.",
      "Primarily supported by Yandex.",
    ],
    reference: [
      {
        text: "The Clean-param directive - Yandex Support",
        url: "https://yandex.com/support/webmaster/en/robot-workings/clean-param",
      },
    ],
    params: [
      {
        label: "<params>",
        documentation: "The query parameters to ignore.",
      },
      {
        label: "<path-pattern>",
        documentation:
          "The path pattern for which the parameters should be ignored (optional).",
      },
    ],
    hiddenCompletion: true,
  },

  host: {
    example: "Host: www.example.com",
    usage: "Host: <domain>",
    description: "Specifies the canonical host for the site.",
    details: [
      "This directive is non-standard and was historically supported by Yandex.",
      "Support is now very limited and most major crawlers ignore it.",
    ],
    params: [
      {
        label: "<domain>",
        documentation: "The domain of the host.",
      },
    ],
    hiddenCompletion: true,
  },

  noindex: {
    example: "Noindex: /private/",
    usage: "Noindex: <path-pattern>",
    description: "Requests that matching pages not be indexed.",
    details: [
      "The value is a path pattern beginning with `/`.",
      "This directive is non-standard and not recognized by most major crawlers.",
      'Use `<meta name="robots">` or the `X-Robots-Tag` HTTP header instead.',
    ],
    reference: [
      {
        text: '<meta name="robots"> - MDN Web Docs',
        url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/robots",
      },
      {
        text: "X-Robots-Tag header - MDN Web Docs",
        url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Robots-Tag",
      },
    ],
    params: [
      {
        label: "<path-pattern>",
        documentation: "A path pattern whose pages should not be indexed.",
      },
    ],
    hiddenCompletion: true,
  },

  "request-rate": {
    example: "Request-rate: 1/5 0800-1800",
    usage: "Request-rate: <rate> [<time-range>]",
    description: "Specifies a crawl rate limit.",
    details: [
      "This directive is non-standard.",
      "Support is limited and many crawlers ignore it.",
    ],
    params: [
      {
        label: "<rate>",
        documentation: "The number of requests allowed within a time period.",
      },
      {
        label: "<time-range>",
        documentation:
          "The time range during which the rate limit applies (optional).",
      },
    ],
    hiddenCompletion: true,
  },

  "visit-time": {
    example: "Visit-time: 0600-0845",
    usage: "Visit-time: <time-range>",
    description: "Specifies preferred crawling time ranges.",
    details: [
      "This directive is non-standard.",
      "Support is very limited and most crawlers ignore it.",
    ],
    params: [
      {
        label: "<time-range>",
        documentation: "A preferred crawling time range.",
      },
    ],
    hiddenCompletion: true,
  },

  "robot-version": {
    example: "Robot-version: 2.0",
    usage: "Robot-version: <version>",
    description: "Specifies the robots.txt file version.",
    details: [
      "This directive is non-standard.",
      "Support is very limited and most crawlers ignore it.",
    ],
    params: [
      {
        label: "<version>",
        documentation: "The robots.txt file version.",
      },
    ],
    hiddenCompletion: true,
  },

  comment: {
    example: "Comment: This is a comment",
    usage: "Comment: <text>",
    description: "Specifies a comment in the robots.txt file.",
    details: [
      "The value is a comment string.",
      "This directive is non-standard.",
      "Support is very limited and most crawlers ignore it.",
      "Use `#` for comments instead of this directive.",
    ],
    params: [
      {
        label: "<text>",
        documentation: "The comment string.",
      },
    ],
    hiddenCompletion: true,
  },
};
