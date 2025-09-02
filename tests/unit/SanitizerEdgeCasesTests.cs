using Xunit;

namespace EdNotes.RichText.Tests;

public class SanitizerEdgeCasesTests
{
    private readonly HtmlPolicySanitizer _sanitizer = new();

    [Theory]
    [InlineData("<a href=\" javascript:alert(1)\">X</a>")]
    [InlineData("<a href=\"JaVaScRiPt:alert(1)\">X</a>")]
    [InlineData("<a href=\"javascript%3aalert(1)\">X</a>")]
    [InlineData("<a href=\"JavaScript%3Aalert(1)\">X</a>")]
    [InlineData("<a href=\"%6A%61%76%61%73%63%72%69%70%74%3Aalert(1)\">X</a>")] // fully encoded javascript:
    [InlineData("<a href=\"%4A%61%76%61%53%63%72%69%70%74%3Aalert(1)\">X</a>")] // mixed case encoded
    [InlineData("<a href=\"j%61v%61script%3Aalert(1)\">X</a>")] // partially encoded
    public void Drops_javascript_protocol_even_encoded(string html)
    {
        var outHtml = _sanitizer.Sanitize(html).ToLowerInvariant();
        Assert.DoesNotContain("javascript:alert", outHtml);
        // Anchor retained with enforced target/rel
        Assert.Contains("<a", outHtml);
        Assert.Contains("target=\"_blank\"", outHtml);
        Assert.Contains("rel=\"noopener noreferrer\"", outHtml);
    }

    [Fact]
    public void Trims_and_keeps_valid_https_link()
    {
        var html = "<p><a href=\" https://example.com/path \" rel=\"foo\" target=\"self\">Go</a></p>";
        var outHtml = _sanitizer.Sanitize(html).ToLowerInvariant();
        Assert.Contains("https://example.com/path", outHtml);
        Assert.DoesNotContain(" rel=\"foo\"", outHtml); // overridden
        Assert.Contains("rel=\"noopener noreferrer\"", outHtml);
        Assert.Contains("target=\"_blank\"", outHtml);
    }

    [Fact]
    public void Removes_disallowed_attributes_and_unknown_tags()
    {
        var html = "<p style=\"color:red\" data-list=\"task\"><span onclick=alert(1)>Hi</span></p>";
        var outHtml = _sanitizer.Sanitize(html).ToLowerInvariant();
        Assert.DoesNotContain("style=", outHtml);
        Assert.DoesNotContain("onclick", outHtml);
        Assert.DoesNotContain("<span", outHtml); // span not allowed
        Assert.Contains("<p", outHtml);
        // allowed custom data-list attribute preserved on allowed element
        Assert.Contains("data-list=\"task\"", outHtml);
    }

    [Fact]
    public void Removes_script_blocks_entirely()
    {
        var html = "<p>Hi<script>alert(1)</script>There</p>";
        var outHtml = _sanitizer.Sanitize(html).ToLowerInvariant();
        Assert.DoesNotContain("<script", outHtml);
        Assert.DoesNotContain("alert(1)", outHtml);
        Assert.Contains("hi", outHtml);
        Assert.Contains("there", outHtml);
    }
}