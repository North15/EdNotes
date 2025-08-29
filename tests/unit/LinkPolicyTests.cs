using System.Text.RegularExpressions;
using Xunit;

namespace EdNotes.RichText.Tests;

public class LinkPolicyTests
{
    private static readonly Regex Allowed = new("^(https?:|mailto:|tel:)", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    [Theory]
    [InlineData("https://example.com", true)]
    [InlineData("http://example.com", true)]
    [InlineData("mailto:user@example.com", true)]
    [InlineData("tel:123", true)]
    [InlineData("javascript:alert(1)", false)]
    [InlineData("data:text/html;base64,abcd", false)]
    public void Scheme_allowlist(string href, bool expected)
    {
        var ok = Allowed.IsMatch(href);
        Assert.Equal(expected, ok);
    }

    [Fact]
    public void Server_sanitizer_removes_disallowed_and_enforces_link_policy()
    {
        var sanitizer = new HtmlPolicySanitizer();
        var input = "<p onclick=\"evil()\" style=\"color:red\">Hi <script>x</script><a href=\"javascript:alert(1)\">X</a><a href=\"https://ok\" rel=\"foo\">OK</a></p>";
        var output = sanitizer.Sanitize(input).ToLowerInvariant();
        Assert.DoesNotContain("javascript:alert", output);
        Assert.Contains("https://ok", output);
        Assert.Contains("target=\"_blank\"", output);
        Assert.Contains("rel=\"noopener noreferrer\"", output);
        Assert.DoesNotContain("onclick", output);
        Assert.DoesNotContain("style=", output);
    }
}
