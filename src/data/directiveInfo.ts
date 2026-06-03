/**
 * Data structures for directive information used in hover and signature help.
 */
export interface ParameterInfo {
  label: string;
  description: string;
  validationType:
    | "path-pattern"
    | "url"
    | "number"
    | "product-token"
    | "query-params"
    | "no-check";
  example: string;
}

/**
 * Information about a web crawler.
 */
export interface WebLinkInfo {
  text: string;
  url: string;
}

/**
 * Information about a robots.txt directive.
 */
export interface DirectiveInfo {
  /** The name of the directive. */
  name: string;
  /** A brief description of the directive's purpose. */
  description: string;
  /** Detailed information about the directive. */
  details: string[];
  /** References to external resources related to the directive. */
  reference: WebLinkInfo[];
  /** Information about the directive's parameters. */
  params: ParameterInfo[];
  /** Whether this directive should be hidden from completion suggestions. */
  hiddenCompletion: boolean;
  /** Whether this directive is deprecated and should be indicated as such in the UI. */
  isDeprecated: boolean;
  /** The scope of this directive, indicating whether it applies globally or to specific user-agents. */
  scope: "global" | "user-agent";
}

/**
 * A record of all known directives, keyed by their lowercase name.
 */
export const DIRECTIVE_INFOS: Record<string, DirectiveInfo> = {
  "user-agent": {
    name: "User-agent",
    description: "Specifies which crawler the following rule group applies to.",
    details: [
      "The value is a crawler name (product token) or `*` for all crawlers.",
      "Matching is case-insensitive and uses the user-agent product token.",
      "Consecutive `User-agent` lines belong to the same group.",
    ],
    reference: [],
    params: [
      {
        label: "<product-token>",
        description: "The name of the crawler to target.",
        validationType: "product-token",
        example: "ExampleBot",
      },
    ],
    hiddenCompletion: false,
    isDeprecated: false,
    scope: "global",
  },

  disallow: {
    name: "Disallow",
    description:
      "Specifies path patterns that are disallowed for matching crawlers.",
    details: [
      "The value is a path beginning with `/`.",
      "When multiple rules match, the longest match is used.",
      "`*` matches any sequence; `$` anchors the end of the path.",
      "An empty value allows all paths.",
    ],
    reference: [],
    params: [
      {
        label: "<path-pattern>",
        description: "The path pattern that should not be crawled.",
        validationType: "path-pattern",
        example: "/script/*.php$",
      },
    ],
    hiddenCompletion: false,
    isDeprecated: false,
    scope: "user-agent",
  },

  allow: {
    name: "Allow",
    description:
      "Specifies path patterns that are allowed for matching crawlers.",
    details: [
      "The value is a path beginning with `/`.",
      "When multiple rules match, the longest match is used.",
      "`*` matches any sequence; `$` anchors the end of the path.",
      "`Allow` rules can override broader `Disallow` rules.",
    ],
    reference: [],
    params: [
      {
        label: "<path-pattern>",
        description: "The path pattern that can be crawled.",
        validationType: "path-pattern",
        example: "/articles/*.html$",
      },
    ],
    hiddenCompletion: false,
    isDeprecated: false,
    scope: "user-agent",
  },

  sitemap: {
    name: "Sitemap",
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
        description: "The sitemap file URL.",
        validationType: "url",
        example: "https://www.example.com/sitemap.xml",
      },
    ],
    hiddenCompletion: false,
    isDeprecated: false,
    scope: "global",
  },

  "crawl-delay": {
    name: "Crawl-delay",
    description: "Specifies the minimum delay between crawler requests.",
    details: [
      "The value is expressed in seconds.",
      "Applies to the current User-agent group.",
      "This directive is non-standard and may be ignored by some crawlers.",
    ],
    reference: [],
    params: [
      {
        label: "<seconds>",
        description: "The number of seconds to wait between crawler requests.",
        validationType: "number",
        example: "10",
      },
    ],
    hiddenCompletion: false,
    isDeprecated: false,
    scope: "user-agent",
  },

  "clean-param": {
    name: "Clean-param",
    description:
      "Specifies URL query parameters that do not affect page content.",
    details: [
      "Multiple parameter names may be separated by `&`.",
      "Optional path pattern to scope the rule.",
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
        description: "The query parameters to ignore.",
        validationType: "query-params",
        example: "sessionid&ref",
      },
      {
        label: "<path-pattern>",
        description:
          "The path pattern for which the parameters should be ignored (optional).",
        validationType: "path-pattern",
        example: "/articles/",
      },
    ],
    hiddenCompletion: true,
    isDeprecated: false,
    scope: "global",
  },

  host: {
    name: "Host",
    description: "Specifies the canonical host for the site.",
    details: [
      "This directive is non-standard and was historically supported by Yandex.",
      "Support is now very limited and most major crawlers ignore it.",
      "Prefer canonical links or HTTP 301 redirects.",
    ],
    reference: [
      {
        text: '<link rel="canonical"> - MDN Web Docs',
        url: "https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/rel",
      },
      {
        text: "301 Moved Permanently - MDN Web Docs",
        url: "https://developer.mozilla.org/docs/Web/HTTP/Reference/Status/301",
      },
    ],
    params: [
      {
        label: "<domain>",
        description: "The canonical hostname.",
        validationType: "no-check",
        example: "www.example.com",
      },
    ],
    hiddenCompletion: true,
    isDeprecated: true,
    scope: "global",
  },

  noindex: {
    name: "Noindex",
    description: "Requests that matching pages not be indexed.",
    details: [
      "This directive is non-standard and not recognized by most major crawlers.",
      'Use `<meta name="robots">` or the `X-Robots-Tag` HTTP header instead.',
    ],
    reference: [
      {
        text: '<meta name="robots"> - MDN Web Docs',
        url: "https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/meta/name/robots",
      },
      {
        text: "X-Robots-Tag header - MDN Web Docs",
        url: "https://developer.mozilla.org/docs/Web/HTTP/Reference/Headers/X-Robots-Tag",
      },
    ],
    params: [
      {
        label: "<path-pattern>",
        description: "A path pattern whose pages should not be indexed.",
        validationType: "no-check",
        example: "/private/",
      },
    ],
    hiddenCompletion: true,
    isDeprecated: true,
    scope: "global",
  },

  "request-rate": {
    name: "Request-rate",
    description: "Specifies a crawl rate limit.",
    details: [
      "This directive is non-standard.",
      "Limited support; most crawlers ignore it.",
    ],
    reference: [],
    params: [
      {
        label: "<rate>",
        description: "The number of requests allowed within a time period.",
        validationType: "no-check",
        example: "1/5",
      },
      {
        label: "<time-range>",
        description:
          "The time range during which the rate limit applies (optional).",
        validationType: "no-check",
        example: "0800-1800",
      },
    ],
    hiddenCompletion: true,
    isDeprecated: false,
    scope: "user-agent",
  },

  "visit-time": {
    name: "Visit-time",
    description: "Specifies preferred crawling time ranges.",
    details: [
      "This directive is non-standard.",
      "Limited support; most crawlers ignore it.",
    ],
    reference: [],
    params: [
      {
        label: "<time-range>",
        description: "A preferred crawling time range.",
        validationType: "no-check",
        example: "0600-1845",
      },
    ],
    hiddenCompletion: true,
    isDeprecated: false,
    scope: "user-agent",
  },

  "robot-version": {
    name: "Robot-version",
    description: "Specifies the robots.txt file version.",
    details: [
      "This directive is non-standard.",
      "Limited support; most crawlers ignore it.",
    ],
    reference: [],
    params: [
      {
        label: "<version>",
        description: "The robots.txt file version.",
        validationType: "no-check",
        example: "2.0",
      },
    ],
    hiddenCompletion: true,
    isDeprecated: false,
    scope: "user-agent",
  },

  comment: {
    name: "Comment",
    description: "Specifies a comment in the robots.txt file.",
    details: [
      "This directive is non-standard.",
      "Limited support; most crawlers ignore it.",
      "Use `#` for comments instead of this directive.",
    ],
    reference: [],
    params: [
      {
        label: "<text>",
        description: "The comment text.",
        validationType: "no-check",
        example: "This is a comment",
      },
    ],
    hiddenCompletion: true,
    isDeprecated: true,
    scope: "global",
  },
};
