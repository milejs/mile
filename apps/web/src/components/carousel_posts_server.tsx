import { MileComponentProps } from "@milejs/types";
import cn from "../lib/cn";
import Richtext from "./richtext";
import { Link } from "./links";
import {
  Carousel,
  CarouselContent,
  CarouselDots,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "./ui/carousel";

const API = `${process.env.NEXT_PUBLIC_HOST_URL}/api/mile`;
const GET_POSTS_API = `${API}/ui/carousel-posts`;
const NEXT_PUBLIC_IMAGE_URL = process.env.NEXT_PUBLIC_IMAGE_URL;

type SinglePost = {
  id: string;
  status: string;
  full_slug: string;
  version_id: string;
  slug: string;
  title: string;
  parent_id: string | null;
  excerpt: string | null;
  og_image_ids: string[];
  og_images: SingleImage[];
  published_at: Date;
  updated_at: Date;
  created_at: Date;
};
type SingleImage = {
  id: string;
  type: string;
  size: number;
  etag?: string | null;
  filepath: string;
  width: number;
  height: number;
  alt?: string;
  caption?: string;
  title?: string;
  updated_at: Date;
  created_at: Date;
};

const slide_options = {
  loop: true,
};

export async function CarouselPosts(props: MileComponentProps) {
  const { options } = props ?? {};
  const { num_posts } = options ?? {};
  const response = await fetch(`${GET_POSTS_API}?limit=${num_posts}`);
  const result = await response.json();
  const posts: SinglePost[] = result?.data ?? [];

  return (
    <div className={cn(`px-4 sm:px-0 py-10 w-full`, props.className)}>
      <div className="max-w-5xl mx-auto">
        {posts.length > 0 && (
          <Carousel className="w-full" opts={slide_options}>
            <CarouselContent>
              {posts.map((post, index) => {
                const image = post.og_images[0];
                return (
                  <CarouselItem key={index}>
                    <div className="relative">
                      <div className="w-full max-h-[560px] overflow-hidden flex justify-center">
                        {post.og_images.length > 0 && (
                          <img
                            src={getImageUrl(image)}
                            alt={image.alt ?? ""}
                            className="w-full object-cover object-center"
                          />
                        )}
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                        <div className="flex flex-col items-center gap-y-4 p-6 text-white">
                          <h4 className="font-medium uppercase text-3xl">
                            {post.title}
                          </h4>
                          {post.excerpt && (
                            <div className="">{post.excerpt}</div>
                          )}
                          <a
                            href={post.full_slug}
                            className="mt-2 px-4 py-2 hover:bg-black/10 border border-white font-medium"
                          >
                            Read Our Blog
                          </a>
                        </div>
                      </div>
                    </div>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
            <CarouselDots />
          </Carousel>
        )}
      </div>
    </div>
  );
}

function getImageUrl(image: SingleImage) {
  return `${NEXT_PUBLIC_IMAGE_URL}/${image.filepath}`;
}
