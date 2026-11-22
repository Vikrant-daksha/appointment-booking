import logo from "../assets/logo.jpeg";
import { logoutAdmin } from "../lib/api.ts";

const imgSrc = (img: string | { src?: string }) =>
  typeof img === "string" ? img : img.src;

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 w-full z-[100]">
      <div className="backdrop-blur-lg bg-white/25 border-b border-black/10 shadow-sm px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <a href="/" className="inline-block">
              <img
                src={imgSrc(logo)}
                alt="Brand logo"
                className="h-10 w-auto rounded-sm block"
              />
            </a>
            {typeof window !== "undefined" &&
              localStorage.getItem("accessToken") && (
                <div className="flex items-center gap-4">
                  <a
                    href="/admin/edit-services"
                    className="text-sm font-medium hover:text-rose-600 transition"
                  >
                    Edit services
                  </a>
                  <a
                    href="/admin/edit-shop"
                    className="text-sm font-medium hover:text-rose-600 transition"
                  >
                    Edit shop
                  </a>
                </div>
              )}
          </div>

          {typeof window !== "undefined" &&
            localStorage.getItem("accessToken") && (
              <button
                type="button"
                onClick={() => logoutAdmin()}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-neutral-300 bg-white/80 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition cursor-pointer"
              >
                Sign out
              </button>
            )}
        </div>
      </div>
    </nav>
  );
}
