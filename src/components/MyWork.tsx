import CardStack from "./kokonutui/card-stack";
import stack1 from "../assets/stack1.jpg";
import stack2 from "../assets/stack 2.jpg";
import stack3 from "../assets/stack 3.jpg";
import stack4 from "../assets/stack 4.jpg";
import stack5 from "../assets/stack 5.jpg";
import stack6 from "../assets/stack 6.jpg";

const imgSrc = (img: string | { src?: string }) =>
  typeof img === "string" ? img : img.src;

const CARDS = [
  {
    id: "work-1",
    title: "Work 01",
    subtitle: "Project",
    art: (
      <img
        src={imgSrc(stack1)}
        alt="Work 01"
        className="size-full object-cover"
        loading="lazy"
        draggable={false}
      />
    ),
    description: "",
    specs: [],
  },
  {
    id: "work-2",
    title: "Work 02",
    subtitle: "Project",
    art: (
      <img
        src={imgSrc(stack2)}
        alt="Work 02"
        className="size-full object-cover"
        loading="lazy"
        draggable={false}
      />
    ),
    description: "",
    specs: [],
  },
  {
    id: "work-3",
    title: "Work 03",
    subtitle: "Project",
    art: (
      <img
        src={imgSrc(stack3)}
        alt="Work 03"
        className="size-full object-cover"
        loading="lazy"
        draggable={false}
      />
    ),
    description: "",
    specs: [],
  },
  {
    id: "work-4",
    title: "Work 04",
    subtitle: "Project",
    art: (
      <img
        src={imgSrc(stack4)}
        alt="Work 04"
        className="size-full object-cover"
        loading="lazy"
        draggable={false}
      />
    ),
    description: "",
    specs: [],
  },
  {
    id: "work-5",
    title: "Work 05",
    subtitle: "Project",
    art: (
      <img
        src={imgSrc(stack5)}
        alt="Work 05"
        className="size-full object-cover"
        loading="lazy"
        draggable={false}
      />
    ),
    description: "",
    specs: [],
  },
  {
    id: "work-6",
    title: "Work 06",
    subtitle: "Project",
    art: (
      <img
        src={imgSrc(stack6)}
        alt="Work 06"
        className="size-full object-cover"
        loading="lazy"
        draggable={false}
      />
    ),
    description: "",
    specs: [],
  },
];

export default function MyWork() {
  return (
    <section className="py-20 px-6 bg-background overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className=" mb-8">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-2">
            Nail Art
          </h2>
          <p className="text-md text-muted-foreground">
            some of my recent works
          </p>
        </div>
        <CardStack
          cards={CARDS}
          accent="#E2B4BD"
          actionLabel="DM on Instagram"
        />
      </div>
    </section>
  );
}
