using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using System.Linq;

namespace EdNotes.RichText;

public class HtmlPolicySanitizer
{
    private static readonly HashSet<string> AllowedTags = new(StringComparer.OrdinalIgnoreCase)
    {
        "p", "h1", "h2", "h3", "ul", "ol", "li", "blockquote", "pre", "code", "hr",
        "table", "thead", "tbody", "tr", "th", "td", "strong", "em", "u", "a"
    };

    private static readonly HashSet<string> AllowedAttributes = new(StringComparer.OrdinalIgnoreCase)
    {
        "href", "target", "rel", "colspan", "rowspan", "data-list", "data-checked"
    };

    private static readonly Regex LinkProtocolAllow = new(@"^(https?:|mailto:|tel:)", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    
    // Regex to match HTML tags and capture tag name and attributes
    private static readonly Regex TagRegex = new(@"<(/?)(\w+)([^>]*)>", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    
    // Regex to match attributes
    private static readonly Regex AttributeRegex = new(@"(\w+)=[""']([^""']*)[""']", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public string Sanitize(string input)
    {
        if (string.IsNullOrEmpty(input))
            return string.Empty;

        // First, remove script and iframe tags completely (including content)
        var result = Regex.Replace(input, @"<script\b[^>]*>.*?</script>", "", RegexOptions.IgnoreCase | RegexOptions.Singleline);
        result = Regex.Replace(result, @"<iframe\b[^>]*>.*?</iframe>", "", RegexOptions.IgnoreCase | RegexOptions.Singleline);
        result = Regex.Replace(result, @"<script\b[^>]*/>", "", RegexOptions.IgnoreCase);
        result = Regex.Replace(result, @"<iframe\b[^>]*/>", "", RegexOptions.IgnoreCase);

        // Process remaining tags
        result = TagRegex.Replace(result, match =>
        {
            var isClosing = !string.IsNullOrEmpty(match.Groups[1].Value);
            var tagName = match.Groups[2].Value.ToLowerInvariant();
            var attributes = match.Groups[3].Value;

            // If tag is not allowed, remove it (but keep content for non-closing tags)
            if (!AllowedTags.Contains(tagName))
            {
                return "";
            }

            // For closing tags, just return as-is if tag is allowed
            if (isClosing)
            {
                return $"</{tagName}>";
            }

            // For opening tags, sanitize attributes
            var sanitizedAttributes = SanitizeAttributes(tagName, attributes);
            
            return $"<{tagName}{sanitizedAttributes}>";
        });

        return result;
    }

    private string SanitizeAttributes(string tagName, string attributesString)
    {
        if (string.IsNullOrWhiteSpace(attributesString))
            return "";

        var result = new List<string>();
        var matches = AttributeRegex.Matches(attributesString);

        foreach (Match match in matches)
        {
            var attrName = match.Groups[1].Value.ToLowerInvariant();
            var attrValue = match.Groups[2].Value;

            // Only include allowed attributes
            if (!AllowedAttributes.Contains(attrName))
                continue;

            // Special handling for href attributes on anchor tags
            if (tagName == "a" && attrName == "href")
            {
                var sanitizedHref = SanitizeHref(attrValue);
                if (!string.IsNullOrEmpty(sanitizedHref))
                {
                    result.Add($"href=\"{sanitizedHref}\"");
                }
            }
            else
            {
                result.Add($"{attrName}=\"{attrValue}\"");
            }
        }

        // For anchor tags with valid href, ensure target and rel are set
        if (tagName == "a" && result.Any(attr => attr.StartsWith("href=")))
        {
            if (!result.Any(attr => attr.StartsWith("target=")))
                result.Add("target=\"_blank\"");
            
            // Replace any existing rel with our secure version
            result.RemoveAll(attr => attr.StartsWith("rel="));
            result.Add("rel=\"noopener noreferrer\"");
        }

        return result.Count > 0 ? " " + string.Join(" ", result) : "";
    }

    private string? SanitizeHref(string href)
    {
        if (string.IsNullOrWhiteSpace(href))
            return null;

        // Trim whitespace
        href = href.Trim();

        // Try to decode to catch encoded javascript: patterns
        try
        {
            var decoded = Uri.UnescapeDataString(href);
            if (decoded != href)
                href = decoded;
        }
        catch
        {
            // Ignore decode errors
        }

        // Block javascript: protocol (case insensitive)
        if (href.StartsWith("javascript:", StringComparison.OrdinalIgnoreCase))
            return null;

        // Only allow specific protocols
        if (!LinkProtocolAllow.IsMatch(href))
            return null;

        return href;
    }
}