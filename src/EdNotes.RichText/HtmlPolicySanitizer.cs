using System.Text;
using System.Text.RegularExpressions;

namespace EdNotes.RichText;

/// <summary>
/// Server-side HTML policy sanitizer that mirrors the client Normalizer/Schema allowlist.
/// Intentionally lightweight (regex + scan) given constrained input size from editor.
/// </summary>
public sealed class HtmlPolicySanitizer
{
	// Allowed element names (lowercase) mirroring client schema
	private static readonly HashSet<string> AllowedTags = new(new[]
	{
		"p","h1","h2","h3","ul","ol","li","blockquote","pre","code","hr",
		"table","thead","tbody","tr","th","td","strong","em","u","a"
	});

	// Allowed attributes per element (global subset for simplicity)
	private static readonly HashSet<string> AllowedAttributes = new(new[]
	{
		"href","target","rel","colspan","rowspan","data-list","data-checked"
	});

	private static readonly Regex TagRegex = new("<(/?)([a-zA-Z0-9]+)([^>]*)>", RegexOptions.Compiled);
	private static readonly Regex AttrRegex = new("([a-zA-Z0-9:-]+)(\\s*=\\s*(\"[^\"]*\"|'[^']*'|[^'\"\\s>]+))?", RegexOptions.Compiled);
	private static readonly Regex DangerousProtocol = new("^(javascript:)", RegexOptions.IgnoreCase | RegexOptions.Compiled);
	private static readonly Regex AllowedHrefScheme = new("^(https?:|mailto:|tel:)", RegexOptions.IgnoreCase | RegexOptions.Compiled);
	private static readonly Regex ScriptLike = new("<(script|iframe)([>\\s])", RegexOptions.IgnoreCase | RegexOptions.Compiled);

	/// <summary>
	/// Sanitize HTML fragment, returning a safe subset.
	/// </summary>
	public string Sanitize(string? input)
	{
		if (string.IsNullOrEmpty(input)) return string.Empty;

		// Remove script / iframe blocks entirely including content (greedy safe due to small docs)
		var working = Regex.Replace(input, "<script[\\s\\S]*?</script>", string.Empty, RegexOptions.IgnoreCase);
		working = Regex.Replace(working, "<iframe[\\s\\S]*?</iframe>", string.Empty, RegexOptions.IgnoreCase);

		var sb = new StringBuilder();
		int lastIndex = 0;
		foreach (Match m in TagRegex.Matches(working))
		{
			// Append text between tags (escaped minimally: we trust original text except angle brackets already segmented)
			if (m.Index > lastIndex)
			{
				// .NET Framework 4.7.2 compatibility: avoid AsSpan
				sb.Append(working.Substring(lastIndex, m.Index - lastIndex));
			}

			var closing = m.Groups[1].Value.Length > 0;
			var tagName = m.Groups[2].Value.ToLowerInvariant();
			var attrPart = m.Groups[3].Value;

			if (!AllowedTags.Contains(tagName))
			{
				// Drop disallowed tag entirely (content preserved via text append logic for non-block removals handled above)
				lastIndex = m.Index + m.Length;
				continue;
			}

			if (closing)
			{
				sb.Append('<').Append('/').Append(tagName).Append('>');
			}
			else
			{
				// Build sanitized start tag
				sb.Append('<').Append(tagName);
				if (!string.IsNullOrEmpty(attrPart))
				{
					foreach (Match am in AttrRegex.Matches(attrPart))
					{
						var rawName = am.Groups[1].Value;
						if (string.IsNullOrEmpty(rawName)) continue;
						var name = rawName.ToLowerInvariant();
						if (!AllowedAttributes.Contains(name)) continue; // skip disallowed attribute names

							var valueGroup = am.Groups[2].Success ? am.Groups[2].Value : string.Empty; // includes =value portion if present
							string value = string.Empty;
							if (valueGroup.Length != 0)
							{
								var eqIdx = valueGroup.IndexOf('=');
								if (eqIdx >= 0 && eqIdx + 1 < valueGroup.Length)
								{
									value = valueGroup.Substring(eqIdx + 1).Trim();
									if (value.Length > 1 && ((value[0] == '"' && value[value.Length - 1] == '"') || (value[0] == '\'' && value[value.Length - 1] == '\'')))
									{
										value = value.Substring(1, value.Length - 2);
									}
								}
							}

						if (name == "href")
						{
							if (string.IsNullOrWhiteSpace(value)) continue;
							var decoded = Uri.UnescapeDataString(value.Trim());
							if (DangerousProtocol.IsMatch(decoded) || !AllowedHrefScheme.IsMatch(decoded))
							{
								continue; // drop unsafe href
							}
							value = decoded;
						}

						if (name == "rel" || name == "target")
						{
							// We'll enforce our own values for links later.
							continue;
						}

							if (value.Length == 0)
							{
								sb.Append(' ').Append(name);
							}
							else
							{
								sb.Append(' ').Append(name).Append("=\"").Append(EscapeAttribute(value)).Append('"');
							}
					}
				}

				if (tagName == "a")
				{
					// Enforce target/rel on all links
					sb.Append(" target=\"_blank\" rel=\"noopener noreferrer\"");
				}
				sb.Append('>');
			}
			lastIndex = m.Index + m.Length;
		}

		if (lastIndex < working.Length)
		{
			// Append remaining tail (no AsSpan for net472)
			sb.Append(working.Substring(lastIndex));
		}

		// Remove any stray angle bracket script openings left (defense-in-depth)
		var result = ScriptLike.Replace(sb.ToString(), string.Empty);
		return result;
	}

	private static string EscapeAttribute(string value)
		=> value.Replace("\"", "&quot;");
}
