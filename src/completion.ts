import * as vscode from "vscode";

/** List of common directives in robots.txt */
const DIRECTIVES = [
  "User-agent: ",
  "Disallow: ",
  "Allow: ",
  "Sitemap: ",
  "Crawl-delay: ",
  "Clean-param: ",
] as const;

interface UserAgentEntry {
  name: string;
  prefix?: string;
  url?: string;
}

// ref. <https://github.com/monperrus/crawler-user-agents/blob/master/crawler-user-agents.json>
/** List of common user-agents in robots.txt */
const USER_AGENTS_ENTRIES: UserAgentEntry[] = [
  { name: "*" },
  /* Google */
  { name: "Googlebot", url: "http://www.google.com/bot.html" },
  { name: "Googlebot-Image", prefix: "Googlebot" },
  { name: "Googlebot-Video", prefix: "Googlebot" },
  { name: "Googlebot-News", prefix: "Googlebot" },
  { name: "Storebot-Google", url: "http://www.google.com/bot.html" },
  { name: "Google-" },
  {
    name: "Google-InspectionTool",
    prefix: "Google-",
    url: "http://www.google.com/bot.html",
  },
  {
    name: "Google-CloudVertexBot",
    prefix: "Google-",
    url: "http://www.google.com/bot.html",
  },
  {
    name: "Google-Extended",
    prefix: "Google-",
    url: "http://www.google.com/bot.html",
  },
  { name: "GoogleOther", url: "http://www.google.com/bot.html" },
  { name: "GoogleOther-Image", prefix: "GoogleOther" },
  { name: "GoogleOther-Video", prefix: "GoogleOther" },
  /* Microsoft */
  { name: "Bingbot", url: "http://www.bing.com/bingbot.htm" },
  { name: "AdIdxBot", url: "http://www.bing.com/bingbot.htm" },
  { name: "MicrosoftPreview", url: "http://www.bing.com/bingbot.htm" },
  { name: "BingVideoPreview", url: "http://www.bing.com/bingbot.htm" },
  /* Yandex */
  { name: "Yandex", url: "http://yandex.com/bots" },
  { name: "YandexAccessibilityBot", prefix: "Yandex" },
  { name: "YandexAdNet", prefix: "Yandex" },
  { name: "YandexBlogs", prefix: "Yandex" },
  { name: "YandexBot", prefix: "Yandex" },
  { name: "YandexCalendar", prefix: "Yandex" },
  { name: "YandexCheckBot", prefix: "Yandex" },
  { name: "YandexDialogs", prefix: "Yandex" },
  { name: "YandexDirect", prefix: "Yandex" },
  { name: "YandexDirectDyn", prefix: "YandexDirect" },
  { name: "YandexFavicons", prefix: "Yandex" },
  { name: "YandexImages", prefix: "Yandex" },
  { name: "YandexImageResizer", prefix: "Yandex" },
  { name: "YandexMarket", prefix: "Yandex" },
  { name: "YandexMedia", prefix: "Yandex" },
  { name: "YandexMetrika", prefix: "Yandex" },
  { name: "YandexMobileBot", prefix: "Yandex" },
  { name: "YandexMobileScreenShotBot", prefix: "Yandex" },
  { name: "YandexOntoDB", prefix: "Yandex" },
  { name: "YandexOntoDBAPI", prefix: "YandexOntoDB" },
  { name: "YandexPagechecker", prefix: "Yandex" },
  { name: "YandexPartner", prefix: "Yandex" },
  { name: "YandexRCA", prefix: "Yandex" },
  { name: "YandexRenderResourcesBot", prefix: "Yandex" },
  { name: "YandexSearchShop", prefix: "Yandex" },
  { name: "YandexSitelinks", prefix: "Yandex" },
  { name: "YandexSpravBot", prefix: "Yandex" },
  { name: "YandexTracker", prefix: "Yandex" },
  { name: "YandexUserproxy", prefix: "Yandex" },
  { name: "YandexVertis", prefix: "Yandex" },
  { name: "YandexVerticals", prefix: "Yandex" },
  { name: "YandexVideo", prefix: "Yandex" },
  { name: "YandexVideoParser", prefix: "YandexVideo" },
  { name: "YandexWebmaster", prefix: "Yandex" },
  { name: "YandexScreenshotBot", prefix: "Yandex" },
  { name: "YandexAdditional", prefix: "Yandex" },
  { name: "YandexAdditionalBot", prefix: "YandexAdditional" },
  /* Baidu */
  { name: "Baiduspider", url: "http://www.baidu.com/search/spider.htm" },
  { name: "Baiduspider-Image", prefix: "Baiduspider" },
  { name: "Baiduspider-Video", prefix: "Baiduspider" },
  /* Yahoo */
  { name: "Slurp", url: "http://help.yahoo.com/help/us/ysearch/slurp" },
  /* DuckDuckGo */
  { name: "DuckDuckBot", url: "http://duckduckgo.com/duckduckbot.html" },
  /* Facebook / Meta */
  {
    name: "FacebookExternalHit",
    url: "http://www.facebook.com/externalhit_uatext.php",
  },
  {
    name: "Meta-WebIndexer",
    prefix: "Meta-",
    url: "http://www.facebook.com/externalhit_uatext.php",
  },
  {
    name: "Meta-ExternalAds",
    prefix: "Meta-",
    url: "http://www.facebook.com/externalhit_uatext.php",
  },
  {
    name: "Meta-ExternalAgent",
    prefix: "Meta-",
    url: "http://www.facebook.com/externalhit_uatext.php",
  },
  {
    name: "Meta-ExternalFetcher",
    prefix: "Meta-",
    url: "http://www.facebook.com/externalhit_uatext.php",
  },
  /* OpenAI */
  { name: "GPTBot", url: "https://openai.com/gptbot" },
  { name: "ChatGPT-User", url: "https://openai.com/gptbot" },
  { name: "OAI-AdsBot", url: "https://openai.com/gptbot" },
  { name: "OAI-SearchBot", url: "https://openai.com/gptbot" },
  /* Amazon */
  { name: "Amazonbot", url: "https://developer.amazon.com/support/amazonbot" },
  {
    name: "AmazonProductDiscovery",
    url: "https://vendorcentral.amazon.com/support/amazonproductbot",
  },
  {
    name: "AmazonSellerInitiatedListing",
    url: "https://vendorcentral.amazon.com/support/amazonproductbot",
  },
  /* Apple */
  { name: "Applebot", url: "http://www.apple.com/go/applebot" },
  {
    name: "Applebot-Extended",
    prefix: "Applebot",
    url: "http://www.apple.com/go/applebot",
  },
  /* Other */
  { name: "PerplexityBot", url: "https://perplexity.ai/perplexitybot" },
  { name: "Perplexity-User", url: "https://perplexity.ai/perplexitybot" },
  { name: "SeznamBot" },
  { name: "coccocbot" },
  { name: "Sogou", url: "http://www.sogou.com/docs/help/webmasters.htm#07" },
  { name: "ClaudeBot" },
  { name: "Bytespider" },
  { name: "Timpibot" },
  { name: "Wayback", url: "http://archive.org/details/archive.org_bot" },
];

/** Creates a new completion item for a keyword */
const newCompletionKeyword = (label: string): vscode.CompletionItem =>
  new vscode.CompletionItem(label, vscode.CompletionItemKind.Keyword);

/** Creates a new completion item for a value */
const newCompletionValue = (label: string): vscode.CompletionItem =>
  new vscode.CompletionItem(label, vscode.CompletionItemKind.Value);

/** Completion item provider for robots.txt */
export class RobotsTxtCompletionItemProvider
  implements vscode.CompletionItemProvider
{
  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.CompletionContext,
  ): vscode.ProviderResult<vscode.CompletionItem[]> {
    // Get the text of the current line up to the cursor position
    const lineParts = document
      .lineAt(position)
      .text.substring(0, position.character)
      .split(":", 2)
      .map((part) => part.trim());

    const directivePart = lineParts[0]?.toLowerCase();
    const valuePart = lineParts[1];

    // If the line is empty or only contains whitespace, suggest all directives
    if (directivePart === undefined) {
      return DIRECTIVES.map(newCompletionKeyword);
    }

    if (valuePart === undefined) {
      // Suggest directives that match the current line prefix
      return DIRECTIVES.filter((directive) =>
        directive.toLowerCase().startsWith(directivePart),
      ).map(newCompletionKeyword);
    }

    // Suggest common user agents
    if (directivePart === "user-agent") {
      const userAgentPart = valuePart.toLowerCase();
      return USER_AGENTS_ENTRIES.filter(
        (ua) =>
          ua.prefix === undefined ||
          userAgentPart.toLowerCase().startsWith(ua.prefix.toLowerCase()),
      )
        .filter((ua) => ua.name.toLowerCase().startsWith(userAgentPart))
        .map((ua) => newCompletionValue(ua.name));
    }

    // Suggest common paths for Disallow and Allow directives
    if (directivePart === "disallow" || directivePart === "allow") {
      // TODO:
      return [
        newCompletionValue("/"),
        newCompletionValue("/private/"),
        newCompletionValue("/public/"),
      ];
    }

    // If no matching directive is found, return undefined
    return undefined;
  }
}
