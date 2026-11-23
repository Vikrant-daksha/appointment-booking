import logo from "../assets/logo.jpeg";
import StaggeredMenu from "./StaggeredMenu.jsx";

const imgSrc = (img: string | { src?: string }) =>
  typeof img === "string" ? img : img.src;

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 w-full z-[100]" aria-label="Main Navigation">
      <div className="backdrop-blur-lg bg-white/85 border-b border-black/10 shadow-xs px-4 sm:px-6 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Site Logo */}
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="inline-block focus:outline-hidden"
              aria-label="Cherrybrush |  Booking Service"
            >
              <img
                src={imgSrc(logo)}
                alt="Cherrybrush |  Booking Service"
                className="h-10 w-auto rounded-sm block object-contain"
              />
            </a>
          </div>

          {/* Staggered menu aligned to the right */}
          <div className="flex items-center ml-auto">
            <StaggeredMenu />
          </div>
        </div>
      </div>
    </nav>
  );
}
