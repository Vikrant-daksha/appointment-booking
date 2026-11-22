import CardFlip from "./kokonutui/card-flip";
import stack1 from "../assets/stack1.jpg";
import stack2 from "../assets/stack 2.jpg";
import stack3 from "../assets/stack 3.jpg";

const imgSrc = (img: string | { src?: string }) =>
  typeof img === "string" ? img : img.src;

const REVIEW_CARDS = [stack1, stack2, stack3];

export default function CustomerReview() {
  return (
    <section className="py-20 px-6 bg-muted/50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            Customer Reviews
          </h2>
          <p className="text-md text-muted-foreground">
            what our clients are say about us
          </p>
        </div>
        <div className="grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
          {REVIEW_CARDS.map((src, i) => (
            <CardFlip
              key={i}
              front={
                <img
                  src={imgSrc(src)}
                  alt={`Review ${i + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  draggable={false}
                />
              }
              back={<div className="w-full h-full bg-white" />}
              label={`Customer review ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
