using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

public class IndexModel : PageModel
{
    [BindProperty]
    public string? Notes { get; set; }

    public void OnGet() { }

    public void OnPost() { }
}
