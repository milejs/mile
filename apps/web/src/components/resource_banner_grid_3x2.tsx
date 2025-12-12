import React, { useEffect, useState } from "react";
import { MileComponentProps } from "@milejs/types";
import cn from "../lib/cn";
import { RichtextView } from "@milejs/core/app";
import NextLink from "next/link";
import { Link } from "./links";

const API = `${process.env.NEXT_PUBLIC_HOST_URL}/api/mile`;
const GET_PAGE_API = `${API}/ui/page`;
const NEXT_PUBLIC_IMAGE_URL = process.env.NEXT_PUBLIC_IMAGE_URL;

function getImage(options: any, page: any) {
  if (!options) return undefined;
  if (options.banner_bg_img?.image_url) {
    return {
      image_url: options.banner_bg_img.image_url ?? null,
      alt_text: options.banner_bg_img.alt_text ?? null,
    };
  }
  if (page && page.og_images && page.og_images.length > 0) {
    return {
      image_url: `${NEXT_PUBLIC_IMAGE_URL}/${page.og_images[0].filepath ?? null}`,
      alt_text: page.og_images[0].alt ?? null,
    };
  }
  return { image_url: null, alt_text: null };
}
function getLinkObject(link: any, page: any) {
  if (link?.url && link?.link_text) {
    return link;
  }
  if (page && page.full_slug) {
    return {
      url: page.full_slug,
      link_text: "Learn more",
    };
  }
  return undefined;
}
function getExcerpt(excerpt: any, page: any) {
  if (excerpt) {
    return excerpt;
  }
  if (page && page.excerpt) {
    return page.excerpt;
  }
  return null;
}

export function ResourceBannerGrid3x2(props: MileComponentProps) {
  const { options } = props ?? {};
  const {
    text,
    page_ref,
    banner_title,
    banner_excerpt,
    banner_bg_img,
    banner_btn_text,
    text0,
    image0,
    image_url0,
    text1,
    image1,
    image_url1,
    text2,
    image2,
    image_url2,
    text3,
    image3,
    image_url3,
    text4,
    image4,
    image_url4,
    text5,
    image5,
    image_url5,
    link,
  } = options ?? {};

  const [page, setPage] = useState<any>(null);
  useEffect(() => {
    const fetchPage = async () => {
      const response = await fetch(`${GET_PAGE_API}/${page_ref}`);
      const result = await response.json();
      if (result) {
        setPage(result);
      }
    };
    if (page_ref) {
      fetchPage();
    }
  }, [page_ref]);

  const banner_link = getLinkObject(banner_btn_text, page);
  const excerpt = getExcerpt(banner_excerpt, page);

  return (
    <div {...props} className={cn(`px-4 sm:px-0 py-5 w-full`, props.className)}>
      <div className="mb-10 max-w-5xl mx-auto space-y-6">
        <div>
          <RichtextView
            blocks={text}
            className="richtext_resource_banner_grid_3x2"
          />
        </div>
        {/* Banner */}
        <div className="relative w-full sm:h-[450px] overflow-hidden">
          <img
            src={getImage(options, page)?.image_url}
            alt={getImage(options, page)?.alt_text}
            className="w-full h-full object-cover object-center"
          />
          <div className="z-10 absolute top-0 left-0 right-0 bottom-0 bg-black/25"></div>
          <div className="z-20 absolute inset-0 text-white flex flex-col items-center justify-center gap-y-4 h-full">
            <h1 className="text-5xl leading-15 font-bold text-center">
              {banner_title
                ? banner_title
                : page && page.title
                  ? page.title
                  : "Title goes here"}
            </h1>
            <div className="">{excerpt}</div>
            {banner_link && <Link {...banner_link} />}
          </div>
        </div>
        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-6 ">
          {/* Item */}
          <div className="flex flex-col gap-y-2">
            <div className="w-full">
              <ImageNode image={image0} url={image_url0} />
            </div>
            <div className="w-full text-left">
              <RichtextView
                blocks={text0}
                className="richtext_condition_content"
              />
            </div>
          </div>
          {/* Item */}
          <div className="flex flex-col gap-y-2">
            <div className="w-full">
              <ImageNode image={image1} url={image_url1} />
            </div>
            <div className="w-full text-left">
              <RichtextView
                blocks={text1}
                className="richtext_condition_content"
              />
            </div>
          </div>
          {/* Item */}
          <div className="flex flex-col gap-y-2">
            <div className="w-full">
              <ImageNode image={image2} url={image_url2} />
            </div>
            <div className="w-full text-left">
              <RichtextView
                blocks={text2}
                className="richtext_condition_content"
              />
            </div>
          </div>
          {/* Item */}
          <div className="flex flex-col gap-y-2">
            <div className="w-full">
              <ImageNode image={image3} url={image_url3} />
            </div>
            <div className="w-full text-left">
              <RichtextView
                blocks={text3}
                className="richtext_condition_content"
              />
            </div>
          </div>
          {/* Item */}
          <div className="flex flex-col gap-y-2">
            <div className="w-full">
              <ImageNode image={image4} url={image_url4} />
            </div>
            <div className="w-full text-left">
              <RichtextView
                blocks={text4}
                className="richtext_condition_content"
              />
            </div>
          </div>
          {/* Item */}
          <div className="flex flex-col gap-y-2">
            <div className="w-full">
              <ImageNode image={image5} url={image_url5} />
            </div>
            <div className="w-full text-left">
              <RichtextView
                blocks={text5}
                className="richtext_condition_content"
              />
            </div>
          </div>
        </div>
        <div className="text-center">
          <Link {...link} variant="secondary" />
        </div>
      </div>
    </div>
  );
}

function ImageNode({
  image,
  url,
}: {
  image?: { image_url: string; alt_text: string };
  url?: string;
}) {
  if (!image || !image.image_url) return null;
  const img_node = (
    <img
      src={image?.image_url ?? null}
      alt={image?.alt_text ?? null}
      className="w-full h-auto"
    />
  );
  return url ? (
    <NextLink href={url} className="">
      {img_node}
    </NextLink>
  ) : (
    img_node
  );
}
