using System.Web.Mvc;

namespace Mvc5Sample.Controllers
{
    public class HomeController : Controller
    {
        public ActionResult Index()
        {
            ViewBag.Initial = "<p>Hello <strong>EdNotes</strong> MVC5!</p>";
            return View();
        }
    }
}
