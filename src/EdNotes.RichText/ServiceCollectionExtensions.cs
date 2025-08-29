using Microsoft.Extensions.DependencyInjection;

namespace EdNotes.RichText;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddRichText(this IServiceCollection services)
    {
        services.AddSingleton<HtmlPolicySanitizer>();
        return services;
    }
}
