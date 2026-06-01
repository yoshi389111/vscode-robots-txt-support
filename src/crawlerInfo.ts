/**
 * Defines the structure for crawler information and a list of known crawlers with their details.
 */
export interface CrawlerInfo {
  /** Name of the crawler. */
  name: string;
  /** Description of the crawler. */
  description: string;
  /** URL for more information about the crawler. */
  url?: string;
  /** Prefix of completion item. lowercase */
  prefix?: string;
  /** Key of the crawler this one inherits from. lowercase */
  inheritsFromKey?: string;
  /** List of directives supported by the crawler. */
  directives?: string[];
  /** Whether to hide hover information for the crawler. */
  hiddenHover?: boolean;
  /** Whether to hide completion items for the crawler. */
  hiddenCompletion?: boolean;
  /** Whether to ignore global user agents for the crawler. */
  ignoreGlobalUserAgents?: boolean;
}

// ref. <https://github.com/monperrus/crawler-user-agents/blob/master/crawler-user-agents.json>
/**
 * List of known crawlers and their information.
 * This is not exhaustive, but includes some of the most common ones.
 * The keys are lowercased for easier matching.
 */
export const CRAWLER_INFOS: Record<string, CrawlerInfo> = {
  "*": {
    name: "*",
    description:
      "Matches all user-agents. This is a wildcard that applies to any crawler not explicitly listed.",
  },

  /* Google */
  googlebot: {
    name: "Googlebot",
    description: "Google's crawler for indexing.",
    url: "http://www.google.com/bot.html",
    directives: ["disallow", "allow", "sitemap"],
  },
  "googlebot-image": {
    name: "Googlebot-Image",
    description: "Google's crawler for indexing images.",
    prefix: "googlebot",
    inheritsFromKey: "googlebot",
  },
  "googlebot-video": {
    name: "Googlebot-Video",
    description: "Google's crawler for indexing videos.",
    prefix: "googlebot",
    inheritsFromKey: "googlebot",
  },
  "googlebot-news": {
    name: "Googlebot-News",
    description: "Google's crawler for indexing news.",
    prefix: "googlebot",
    inheritsFromKey: "googlebot",
  },
  "storebot-google": {
    name: "Storebot-Google",
    description: "Google's crawler for indexing store content.",
    inheritsFromKey: "googlebot",
  },
  "google-": {
    name: "Google-",
    description: "Placeholder entry for Google-* user agents.",
    hiddenHover: true,
  },
  "google-inspectiontool": {
    name: "Google-InspectionTool",
    description: "Google's crawler for search testing tools.",
    prefix: "google-",
    inheritsFromKey: "googlebot",
  },
  "google-cloudvertexbot": {
    name: "Google-CloudVertexBot",
    description: "Google's crawler for Vertex AI Agents.",
    prefix: "google-",
    inheritsFromKey: "googlebot",
  },
  "google-extended": {
    name: "Google-Extended",
    description: "Google's crawler for Gemini Apps and Vertex AI.",
    prefix: "google-",
    inheritsFromKey: "googlebot",
  },
  googleother: {
    name: "GoogleOther",
    description: "Google's crawler for internal research and development.",
    inheritsFromKey: "googlebot",
  },
  "googleother-image": {
    name: "GoogleOther-Image",
    description: "Google's crawler for internal research and development.",
    prefix: "googleother",
    inheritsFromKey: "googlebot",
  },
  "googleother-video": {
    name: "GoogleOther-Video",
    description: "Google's crawler for internal research and development.",
    prefix: "googleother",
    inheritsFromKey: "googlebot",
  },
  "apis-google": {
    name: "APIs-Google",
    description:
      "Google's crawler for API monitoring and service health checks.",
    inheritsFromKey: "googlebot",
    ignoreGlobalUserAgents: true,
  },
  "adsbot-google-mobile": {
    name: "AdsBot-Google-Mobile",
    description:
      "Google's crawler for testing mobile-friendliness of landing pages for ads.",
    inheritsFromKey: "googlebot",
    ignoreGlobalUserAgents: true,
  },
  "adsbot-google": {
    name: "AdsBot-Google",
    description:
      "Google's crawler for testing the quality of landing pages for ads.",
    inheritsFromKey: "googlebot",
    ignoreGlobalUserAgents: true,
  },
  "mediapartners-google": {
    name: "Mediapartners-Google",
    description:
      "Google's crawler for AdSense content analysis and ad targeting.",
    inheritsFromKey: "googlebot",
    ignoreGlobalUserAgents: true,
  },

  /* Microsoft */
  bingbot: {
    name: "Bingbot",
    description: "Microsoft's crawler for indexing.",
    url: "http://www.bing.com/bingbot.htm",
    directives: ["disallow", "allow", "sitemap"],
  },
  adidxbot: {
    name: "AdIdxBot",
    description: "Microsoft's crawler for ad quality and policy checks.",
    inheritsFromKey: "bingbot",
  },
  microsoftpreview: {
    name: "MicrosoftPreview",
    description: "Microsoft's crawler for previewing content.",
    inheritsFromKey: "bingbot",
  },
  bingvideopreview: {
    name: "BingVideoPreview",
    description: "Microsoft's crawler for previewing video.",
    inheritsFromKey: "bingbot",
  },

  /* Apple */
  applebot: {
    name: "Applebot",
    description: "Apple's crawler for indexing.",
    url: "http://www.apple.com/go/applebot",
  },
  "applebot-extended": {
    name: "Applebot-Extended",
    description: "Apple's crawler for Generative AI.",
    prefix: "applebot",
    inheritsFromKey: "applebot",
  },

  /* Yandex */
  yandex: {
    name: "Yandex",
    description: "Yandex's crawler for indexing.",
    url: "http://yandex.com/bots",
    directives: ["disallow", "allow", "sitemap", "crawl-delay", "clean-param"],
  },

  /* Baidu */
  baiduspider: {
    name: "Baiduspider",
    description: "Baidu's crawler for indexing.",
    url: "http://www.baidu.com/search/spider.htm",
  },
  "baiduspider-image": {
    name: "Baiduspider-Image",
    description: "Baidu's crawler for indexing images.",
    prefix: "baiduspider",
    inheritsFromKey: "baiduspider",
  },
  "baiduspider-video": {
    name: "Baiduspider-Video",
    description: "Baidu's crawler for indexing videos.",
    prefix: "baiduspider",
    inheritsFromKey: "baiduspider",
  },

  /* Yahoo */
  slurp: {
    name: "Slurp",
    description: "Yahoo's crawler for indexing.",
    url: "http://help.yahoo.com/help/us/ysearch/slurp",
  },

  /* DuckDuckGo */
  duckduckbot: {
    name: "DuckDuckBot",
    description: "DuckDuckGo's crawler for indexing.",
    url: "http://duckduckgo.com/duckduckbot.html",
  },

  /* Facebook / Meta */
  facebookexternalhit: {
    name: "FacebookExternalHit",
    description: "Facebook's crawler for indexing and link previews.",
    url: "http://www.facebook.com/externalhit_uatext.php",
  },
  "meta-": {
    name: "Meta-",
    description: "Placeholder entry for Meta-* user agents.",
    hiddenHover: true,
  },
  "meta-webindexer": {
    name: "Meta-WebIndexer",
    description: "Meta's crawler for Meta AI.",
    prefix: "meta-",
    inheritsFromKey: "facebookexternalhit",
  },
  "meta-externalads": {
    name: "Meta-ExternalAds",
    description: "Meta's crawler for qualifying ads.",
    prefix: "meta-",
    inheritsFromKey: "facebookexternalhit",
  },
  "meta-externalagent": {
    name: "Meta-ExternalAgent",
    description: "Meta's crawler for AI model training.",
    prefix: "meta-",
    inheritsFromKey: "facebookexternalhit",
  },
  "meta-externalfetcher": {
    name: "Meta-ExternalFetcher",
    description: "Meta's crawler for qualifying AI agents.",
    prefix: "meta-",
    inheritsFromKey: "facebookexternalhit",
  },

  /* OpenAI */
  gptbot: {
    name: "GPTBot",
    description: "OpenAI's GPT crawler for generative AI.",
    url: "https://openai.com/gptbot",
  },
  "chatgpt-user": {
    name: "ChatGPT-User",
    description: "OpenAI's GPT fetcher for user requests.",
    inheritsFromKey: "gptbot",
  },
  "oai-": {
    name: "OAI-",
    description: "Placeholder entry for OAI-* user agents.",
    hiddenHover: true,
  },
  "oai-adsbot": {
    name: "OAI-AdsBot",
    description: "OpenAI's GPT crawler for ads.",
    prefix: "oai-",
    inheritsFromKey: "gptbot",
  },
  "oai-searchbot": {
    name: "OAI-SearchBot",
    description: "OpenAI's GPT crawler for search.",
    prefix: "oai-",
    inheritsFromKey: "gptbot",
  },

  /* Amazon */
  amazonbot: {
    name: "Amazonbot",
    description:
      "Amazon's crawler for service quality checks and AI-related processing.",
    url: "https://developer.amazon.com/support/amazonbot",
  },
  "amzn-": {
    name: "Amzn-",
    description: "Placeholder entry for Amzn-* user agents.",
    hiddenHover: true,
  },
  "amzn-searchbot": {
    name: "Amzn-SearchBot",
    description:
      "Amazon's crawler for Alexa and Rufus retrieval, not model training.",
    prefix: "amzn-",
    inheritsFromKey: "amazonbot",
  },
  "amzn-user": {
    name: "Amzn-User",
    description:
      "Amazon's fetcher for user requests to Alexa and Rufus without AI training.",
    prefix: "amzn-",
    inheritsFromKey: "amazonbot",
  },

  /* Perplexity */
  perplexitybot: {
    name: "PerplexityBot",
    description: "Perplexity's crawler for indexing without AI training.",
    url: "https://perplexity.ai/perplexitybot",
  },
  "perplexity-user": {
    name: "Perplexity-User",
    description: "Perplexity's fetcher for user requests without AI training.",
    inheritsFromKey: "perplexitybot",
  },

  /* Anthropic */
  claudebot: {
    name: "ClaudeBot",
    description: "Anthropic's crawler for AI training.",
    url: "https://support.anthropic.com/",
  },
  "claude-user": {
    name: "Claude-User",
    description: "Anthropic's fetcher for user requests.",
    inheritsFromKey: "claudebot",
  },
  "claude-searchbot": {
    name: "Claude-SearchBot",
    description: "Anthropic's crawler for indexing.",
    inheritsFromKey: "claudebot",
  },

  /* ByteDance / TikTok */
  bytespider: {
    name: "Bytespider",
    description: "ByteDance's crawler for indexing and AI training.",
  },

  /* Internet Archive */
  "archive.org_bot": {
    name: "archive.org_bot",
    description: "Internet Archive's crawler for archiving.",
    url: "http://archive.org/details/archive.org_bot",
    hiddenCompletion: true,
  },

  /* Other */
  seznambot: {
    name: "SeznamBot",
    description: "Crawler for Seznam, a Czech search engine.",
    hiddenCompletion: true,
  },
  coccocbot: {
    name: "CoccocBot",
    description: "Crawler for Coccoc, a Vietnamese search engine.",
    url: "http://help.coccoc.com/searchengine",
    hiddenCompletion: true,
  },
  sogou: {
    name: "Sogou",
    description: "Crawler for Sogou, a Chinese search engine.",
    url: "http://www.sogou.com/docs/help/webmasters.htm#07",
    hiddenCompletion: true,
  },
  timpibot: {
    name: "Timpibot",
    description: "Timpi's crawler.",
    hiddenCompletion: true,
  },
  ccbot: {
    name: "CCBot",
    description: "Common Crawl's crawler for web archiving.",
    url: "https://commoncrawl.org/faq/",
    hiddenCompletion: true,
  },
  petalbot: {
    name: "PetalBot",
    description: "PetalBot is the web crawler used by Petal Search.",
    url: "https://aspiegel.com/petalbot",
    hiddenCompletion: true,
  },
  semrushbot: {
    name: "SemrushBot",
    description: "SemrushBot is the crawler used by Semrush.",
    url: "http://www.semrush.com/bot.html",
    hiddenCompletion: true,
  },
  dotbot: {
    name: "DotBot",
    description: "Moz's crawler for Link Explorer (formerly Open Site Explorer).",
    url: "http://www.opensiteexplorer.org/dotbot",
    hiddenCompletion: true,
  },
  mj12bot: {
    name: "MJ12bot",
    description: "MJ12bot is the crawler used by Majestic-12.",
    url: "http://www.majestic12.co.uk/bot.php",
    hiddenCompletion: true,
  },
  ahrefsbot: {
    name: "AhrefsBot",
    description: "AhrefsBot is the crawler used by Ahrefs.",
    url: "http://ahrefs.com/robot/",
    hiddenCompletion: true,
  },
} as const;
