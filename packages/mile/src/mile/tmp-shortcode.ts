import { generateId } from "@/lib/generate-id";
import { asyncWalk } from "estree-walker";
import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import remarkStringify from "remark-stringify";
import { unified } from "unified";
import JSON5 from "json5";
import { BlockNoteEditor } from "@blocknote/core";

const editor = BlockNoteEditor.create();

/**
 * Memize options object.
 */
interface MemizeOptions {
  /** Maximum size of the cache. */
  maxSize?: number;
}

/**
 * Internal cache entry.
 */
interface MemizeCacheNode<T extends any[] = any[]> {
  /** Previous node. */
  prev?: MemizeCacheNode<T>;
  /** Next node. */
  next?: MemizeCacheNode<T>;
  /** Function arguments for cache entry. */
  args: T;
  /** Function result. */
  val: any;
}

/**
 * Properties of the enhanced function for controlling cache.
 */
interface MemizeMemoizedFunction {
  /** Clear the cache. */
  clear: () => void;
}

/**
 * Accepts a function to be memoized, and returns a new memoized function, with
 * optional options.
 */
function memize<F extends (...args: any[]) => any>(
  fn: F,
  options?: MemizeOptions,
): ((...args: Parameters<F>) => ReturnType<F>) & MemizeMemoizedFunction {
  let size = 0;
  let head: MemizeCacheNode | undefined;
  let tail: MemizeCacheNode | undefined;

  options = options || {};

  function memoized(...args: Parameters<F>): ReturnType<F> {
    let node = head;
    const len = args.length;

    searchCache: while (node) {
      // Perform a shallow equality test to confirm that whether the node
      // under test is a candidate for the arguments passed. Two arrays
      // are shallowly equal if their length matches and each entry is
      // strictly equal between the two sets. Avoid abstracting to a
      // function which could incur an arguments leaking deoptimization.

      // Check whether node arguments match arguments length
      if (node.args.length !== args.length) {
        node = node.next;
        continue;
      }

      // Check whether node arguments match arguments values
      for (let i = 0; i < len; i++) {
        if (node.args[i] !== args[i]) {
          node = node.next;
          continue searchCache;
        }
      }

      // At this point we can assume we've found a match

      // Surface matched node to head if not already
      if (node !== head) {
        // As tail, shift to previous. Must only shift if not also
        // head, since if both head and tail, there is no previous.
        if (node === tail) {
          tail = node.prev;
        }

        // Adjust siblings to point to each other. If node was tail,
        // this also handles new tail's empty `next` assignment.
        node.prev!.next = node.next;
        if (node.next) {
          node.next.prev = node.prev;
        }

        node.next = head;
        node.prev = undefined;
        head!.prev = node;
        head = node;
      }

      // Return immediately
      return node.val;
    }

    // No cached value found. Continue to insertion phase:

    const newNode: MemizeCacheNode = {
      args: args,
      // Generate the result from original function
      val: fn(...args),
    };

    // Don't need to check whether node is already head, since it would
    // have been returned above already if it was

    // Shift existing head down list
    if (head) {
      head.prev = newNode;
      newNode.next = head;
    } else {
      // If no head, follows that there's no tail (at initial or reset)
      tail = newNode;
    }

    // Trim tail if we're reached max size and are pending cache insertion
    if (options && size === options.maxSize) {
      tail = tail!.prev;
      tail!.next = undefined;
    } else {
      size++;
    }

    head = newNode;

    return newNode.val;
  }

  memoized.clear = function () {
    head = undefined;
    tail = undefined;
    size = 0;
  };

  if (process.env.NODE_ENV === "test") {
    // Cache is not exposed in the public API, but used in tests to ensure
    // expected list progression
    (memoized as any).getCache = function () {
      return [head, tail, size];
    };
  }

  return memoized as ((...args: Parameters<F>) => ReturnType<F>) &
    MemizeMemoizedFunction;
}

/**
 * Find the next matching shortcode.
 *
 * @param {string} tag   Shortcode tag.
 * @param {string} text  Text to search.
 * @param {number} index Index to start search from.
 *
 * @return {import('./types').ShortcodeMatch | undefined} Matched information.
 */
export function next(tag: string, text: string, index = 0) {
  const re = regexp(tag);

  re.lastIndex = index;

  const match = re.exec(text);

  if (!match) {
    return;
  }

  // If we matched an escaped shortcode, try again.
  if ("[" === match[1] && "]" === match[7]) {
    return next(tag, text, re.lastIndex);
  }

  const result = {
    index: match.index,
    content: match[0],
    shortcode: fromMatch(match),
  };

  // If we matched a leading `[`, strip it from the match and increment the
  // index accordingly.
  if (match[1]) {
    result.content = result.content.slice(1);
    result.index++;
  }

  // If we matched a trailing `]`, strip it from the match.
  if (match[7]) {
    result.content = result.content.slice(0, -1);
  }

  return result;
}

/**
 * Replace matching shortcodes in a block of text.
 *
 * @param {string}                            tag      Shortcode tag.
 * @param {string}                            text     Text to search.
 * @param {import('./types').ReplaceCallback} callback Function to process the match and return
 *                                                     replacement string.
 *
 * @return {string} Text with shortcodes replaced.
 */
export function replace(tag: string, text: string, callback: any) {
  return text.replace(
    regexp(tag),
    function (match, left, $3, attrs, slash, content, closing, right) {
      // If both extra brackets exist, the shortcode has been properly
      // escaped.
      if (left === "[" && right === "]") {
        return match;
      }

      // Create the match object and pass it through the callback.
      // @ts-expect-error okk
      const result = callback(fromMatch(arguments));

      // Make sure to return any of the extra brackets if they weren't used to
      // escape the shortcode.
      return result || result === "" ? left + result + right : match;
    },
  );
}

/**
 * Generate a string from shortcode parameters.
 *
 * Creates a shortcode instance and returns a string.
 *
 * Accepts the same `options` as the `shortcode()` constructor, containing a
 * `tag` string, a string or object of `attrs`, a boolean indicating whether to
 * format the shortcode using a `single` tag, and a `content` string.
 *
 * @param {Object} options
 *
 * @return {string} String representation of the shortcode.
 */
export function string(options: ShortcodeOptions) {
  // @ts-expect-error okk
  return new shortcode(options).string();
}

/**
 * Generate a RegExp to identify a shortcode.
 *
 * The base regex is functionally equivalent to the one found in
 * `get_shortcode_regex()` in `wp-includes/shortcodes.php`.
 *
 * Capture groups:
 *
 * 1. An extra `[` to allow for escaping shortcodes with double `[[]]`
 * 2. The shortcode name
 * 3. The shortcode argument list
 * 4. The self closing `/`
 * 5. The content of a shortcode when it wraps some content.
 * 6. The closing tag.
 * 7. An extra `]` to allow for escaping shortcodes with double `[[]]`
 *
 * @param {string} tag Shortcode tag.
 *
 * @return {RegExp} Shortcode RegExp.
 */
export function regexp(tag: string) {
  return new RegExp(
    "\\[(\\[?)(" +
      tag +
      ")(?![\\w-])([^\\]\\/]*(?:\\/(?!\\])[^\\]\\/]*)*?)(?:(\\/)\\]|\\](?:([^\\[]*(?:\\[(?!\\/\\2\\])[^\\[]*)*)(\\[\\/\\2\\]))?)(\\]?)",
    "g",
  );
}

/**
 * Parse shortcode attributes.
 *
 * Shortcodes accept many types of attributes. These can chiefly be divided into
 * named and numeric attributes:
 *
 * Named attributes are assigned on a key/value basis, while numeric attributes
 * are treated as an array.
 *
 * Named attributes can be formatted as either `name="value"`, `name='value'`,
 * or `name=value`. Numeric attributes can be formatted as `"value"` or just
 * `value`.
 *
 * @param {string} text Serialised shortcode attributes.
 *
 * @return {import('./types').ShortcodeAttrs} Parsed shortcode attributes.
 */
export const attrs = memize((text) => {
  const named = {};
  const numeric = [];

  // This regular expression is reused from `shortcode_parse_atts()` in
  // `wp-includes/shortcodes.php`.
  //
  // Capture groups:
  //
  // 1. An attribute name, that corresponds to...
  // 2. a value in double quotes.
  // 3. An attribute name, that corresponds to...
  // 4. a value in single quotes.
  // 5. An attribute name, that corresponds to...
  // 6. an unquoted value.
  // 7. A numeric attribute in double quotes.
  // 8. A numeric attribute in single quotes.
  // 9. An unquoted numeric attribute.
  const pattern =
    /([\w-]+)\s*=\s*"([^"]*)"(?:\s|$)|([\w-]+)\s*=\s*'([^']*)'(?:\s|$)|([\w-]+)\s*=\s*([^\s'"]+)(?:\s|$)|"([^"]*)"(?:\s|$)|'([^']*)'(?:\s|$)|(\S+)(?:\s|$)/g;

  // Map zero-width spaces to actual spaces.
  text = text.replace(/[\u00a0\u200b]/g, " ");

  let match;

  // Match and normalize attributes.
  while ((match = pattern.exec(text))) {
    if (match[1]) {
      // @ts-expect-error okk
      named[match[1].toLowerCase()] = match[2];
    } else if (match[3]) {
      // @ts-expect-error okk
      named[match[3].toLowerCase()] = match[4];
    } else if (match[5]) {
      // @ts-expect-error okk
      named[match[5].toLowerCase()] = match[6];
    } else if (match[7]) {
      numeric.push(match[7]);
    } else if (match[8]) {
      numeric.push(match[8]);
    } else if (match[9]) {
      numeric.push(match[9]);
    }
  }

  return { named, numeric };
});

type Match = NonNullable<ReturnType<RegExp["exec"]>> | Array<string>;
/**
 * Generate a Shortcode Object from a RegExp match.
 *
 * Accepts a `match` object from calling `regexp.exec()` on a `RegExp` generated
 * by `regexp()`. `match` can also be set to the `arguments` from a callback
 * passed to `regexp.replace()`.
 */
export function fromMatch(match: Match) {
  let type;

  if (match[4]) {
    type = "self-closing";
  } else if (match[6]) {
    type = "closed";
  } else {
    type = "single";
  }

  // @ts-expect-error okk
  return new shortcode({
    tag: match[2],
    attrs: match[3],
    // @ts-expect-error okk
    type,
    content: match[5],
  });
}

interface Shortcode extends ShortcodeOptions {
  /**
   * Shortcode attributes.
   */
  attrs: ShortcodeAttrs;
}

type ShortcodeAttrs = {
  /**
   * Object with named attributes.
   */
  named: Record<string, string | undefined>;

  /**
   * Array with numeric attributes.
   */
  numeric: string[];
};

type ShortcodeMatch = {
  /**
   * Index the shortcode is found at.
   */
  index: number;

  /**
   * Matched content.
   */
  content: string;

  /**
   * Shortcode instance of the match.
   */
  shortcode: Shortcode;
};

interface ShortcodeOptions {
  /**
   * Shortcode tag.
   */
  tag: string;

  /**
   * Shortcode attributes.
   */
  attrs?: Partial<ShortcodeAttrs> | string;

  /**
   * Shortcode content.
   */
  content?: string;

  /**
   * Shortcode type: `self-closing`, `closed`, or `single`.
   */
  type?: "self-closing" | "closed" | "single";
}

/**
 * Creates a shortcode instance.
 *
 * To access a raw representation of a shortcode, pass an `options` object,
 * containing a `tag` string, a string or object of `attrs`, a string indicating
 * the `type` of the shortcode ('single', 'self-closing', or 'closed'), and a
 * `content` string.
 *
 * @type {import('./types').shortcode} Shortcode instance.
 */
export const shortcode = Object.assign(
  function (options: ShortcodeOptions) {
    const { tag, attrs: attributes, type, content } = options || {};
    // @ts-expect-error okk
    Object.assign(this, { tag, type, content });

    // Ensure we have a correctly formatted `attrs` object.
    // @ts-expect-error okk
    this.attrs = {
      named: {},
      numeric: [],
    };

    if (!attributes) {
      return;
    }

    const attributeTypes = ["named", "numeric"];

    // Parse a string of attributes.
    if (typeof attributes === "string") {
      // @ts-expect-error okk
      this.attrs = attrs(attributes);
      // Identify a correctly formatted `attrs` object.
    } else if (
      // @ts-expect-error okk
      attributes.length === attributeTypes.length &&
      // @ts-expect-error okk
      attributeTypes.every((t, key) => t === attributes[key])
    ) {
      // @ts-expect-error okk
      this.attrs = attributes;
      // Handle a flat object of attributes.
    } else {
      Object.entries(attributes).forEach(([key, value]) => {
        // @ts-expect-error okk
        this.set(key, value);
      });
    }
  },
  {
    next,
    replace,
    string,
    regexp,
    attrs,
    fromMatch,
  },
);

Object.assign(shortcode.prototype, {
  /**
   * Get a shortcode attribute.
   *
   * Automatically detects whether `attr` is named or numeric and routes it
   * accordingly.
   *
   * @param {(number|string)} attr Attribute key.
   *
   * @return {string} Attribute value.
   */
  get(attr: number | string): string {
    // @ts-expect-error okk
    return this.attrs[typeof attr === "number" ? "numeric" : "named"][attr];
  },

  /**
   * Set a shortcode attribute.
   *
   * Automatically detects whether `attr` is named or numeric and routes it
   * accordingly.
   *
   * @param {(number|string)} attr  Attribute key.
   * @param {string}          value Attribute value.
   *
   * @return {InstanceType< import('./types').shortcode >} Shortcode instance.
   */
  set(attr: number | string, value: string) {
    // @ts-expect-error okk
    this.attrs[typeof attr === "number" ? "numeric" : "named"][attr] = value;
    return this;
  },

  /**
   * Transform the shortcode into a string.
   *
   * @return {string} String representation of the shortcode.
   */
  string(): string {
    // @ts-expect-error okk
    let text = "[" + this.tag;

    // @ts-expect-error okk
    this.attrs.numeric.forEach((value) => {
      if (/\s/.test(value)) {
        text += ' "' + value + '"';
      } else {
        text += " " + value;
      }
    });

    // @ts-expect-error okk
    Object.entries(this.attrs.named).forEach(([name, value]) => {
      text += " " + name + '="' + value + '"';
    });

    // If the tag is marked as `single` or `self-closing`, close the tag and
    // ignore any additional content.
    // @ts-expect-error okk
    if ("single" === this.type) {
      return text + "]";
      // @ts-expect-error okk
    } else if ("self-closing" === this.type) {
      return text + " /]";
    }

    // Complete the opening tag.
    text += "]";

    // @ts-expect-error okk
    if (this.content) {
      // @ts-expect-error okk
      text += this.content;
    }

    // Add the closing tag.
    // @ts-expect-error okk
    return text + "[/" + this.tag + "]";
  },
});

type TextNode = {
  type: "text";
  content: string;
};
type ShortCodeNode = {
  type: string;
  tag: string;
  shortcodeType: string;
  attrs: {
    named: any;
    numeric: any[];
  };
  children: (ShortCodeNode | TextNode)[];
};

type ParseResult = {
  type: string;
  children: (ShortCodeNode | TextNode)[];
};

export function parseNestedShortcodes(text: string, tag = "[\\w-]+") {
  const root: ParseResult = {
    type: "root",
    children: [],
  };

  const stack = [root];
  let currentIndex = 0;

  // Regex to match opening tags, closing tags, and self-closing tags
  const openingPattern = new RegExp(`\\[(${tag})([^\\]]*?)\\]`, "g");
  const closingPattern = new RegExp(`\\[\\/(${tag})\\]`, "g");
  const selfClosingPattern = new RegExp(`\\[(${tag})([^\\]]*?)\\/\\]`, "g");

  while (currentIndex < text.length) {
    // Find next opening, closing, or self-closing tag
    openingPattern.lastIndex = currentIndex;
    closingPattern.lastIndex = currentIndex;
    selfClosingPattern.lastIndex = currentIndex;

    const openingMatch = openingPattern.exec(text);
    const closingMatch = closingPattern.exec(text);
    const selfClosingMatch = selfClosingPattern.exec(text);

    // Find which match comes first
    let nextMatch = null;
    let matchType = null;

    const candidates = [
      { match: openingMatch, type: "opening" },
      { match: closingMatch, type: "closing" },
      { match: selfClosingMatch, type: "self-closing" },
    ].filter((c) => c.match !== null);

    if (candidates.length === 0) {
      // No more matches, add remaining text
      const remainingText = text.slice(currentIndex).trim();
      if (remainingText) {
        stack[stack.length - 1].children.push({
          type: "text",
          content: remainingText,
        });
      }
      break;
    }

    // Sort by index to find the earliest match
    candidates.sort((a, b) => (a.match?.index ?? 0) - (b.match?.index ?? 0));
    nextMatch = candidates[0].match!;
    matchType = candidates[0].type!;

    // Add any text before this match
    if (nextMatch.index > currentIndex) {
      const textBefore = text.slice(currentIndex, nextMatch.index).trim();
      if (textBefore) {
        stack[stack.length - 1].children.push({
          type: "text",
          content: textBefore,
        });
      }
    }

    if (matchType === "closing") {
      // Closing tag - pop from stack
      const tagName = nextMatch[1];

      // Find matching opening tag in stack
      let found = false;
      for (let i = stack.length - 1; i > 0; i--) {
        // @ts-expect-error stack has only one element (root)
        if (stack[i].tag === tagName) {
          // Pop all tags down to this one
          stack.length = i;
          found = true;
          break;
        }
      }

      currentIndex = nextMatch.index + nextMatch[0].length;
    } else if (matchType === "self-closing") {
      // Self-closing tag
      const tagName = nextMatch[1];
      const attrString = nextMatch[2].trim();

      const node = {
        type: "shortcode",
        tag: tagName,
        attrs: attrString ? attrs(attrString) : { named: {}, numeric: [] },
        shortcodeType: "self-closing",
        children: [],
      };

      stack[stack.length - 1].children.push(node);
      currentIndex = nextMatch.index + nextMatch[0].length;
    } else {
      // Opening tag
      const tagName = nextMatch[1];
      const attrString = nextMatch[2].trim();

      const node = {
        type: "shortcode",
        tag: tagName,
        attrs: attrString ? attrs(attrString) : { named: {}, numeric: [] },
        shortcodeType: "closed",
        children: [],
      };

      stack[stack.length - 1].children.push(node);
      stack.push(node);
      currentIndex = nextMatch.index + nextMatch[0].length;
    }
  }

  return root;
}

function patternsMatch(input: any[], pattern: any[]) {
  // if pattern array is a list of string type
  // we check type only
  if (pattern.every((e) => typeof e === "string")) {
    const a = input.map((child) => child.type);
    const b = pattern;
    if (a.length !== b.length) return false;
    return a.every((val, i) => val === b[i]);
  }
  // now pattern is a list of object
  if (input.length !== pattern.length) return false;

  for (let i = 0; i < pattern.length; i++) {
    const pat = pattern[i];
    const inp = input[i];

    // --- Case 1: pattern is a string → match on `type`
    if (typeof pat === "string") {
      if (inp.type !== pat) return false;
      continue;
    }

    // --- Case 2: pattern is an object → partial deep match
    if (pat.type && inp.type !== pat.type) {
      return false;
    }

    if (pat.attrs) {
      const pAttrs = pat.attrs;
      const iAttrs = inp.attrs || {};

      // Match named attributes (partial match)
      if (pAttrs.named) {
        const iNamed = iAttrs.named || {};
        for (const key of Object.keys(pAttrs.named)) {
          if (iNamed[key] !== pAttrs.named[key]) {
            return false;
          }
        }
      }

      // Match numeric attributes array if provided
      if (pAttrs.numeric) {
        const iNum = iAttrs.numeric || [];
        if (JSON.stringify(iNum) !== JSON.stringify(pAttrs.numeric)) {
          return false;
        }
      }
    }
  }

  return true;
}

async function matchPattern(
  snapshot: any[],
  patternMap: Record<
    string,
    { pattern: any[]; content: (snapshot: any[], processor: any) => any }
  >,
  processor: any,
) {
  for (const [name, entry] of Object.entries(patternMap)) {
    if (patternsMatch(snapshot, entry.pattern)) {
      return { name, content: await entry.content(snapshot, processor) };
    }
  }
  return null; // no match
}

// TODO: pattern should be {type, attrs}
const row_pattern_condition_intro = [
  "et_pb_section",
  "et_pb_row",
  "et_pb_column",
  "et_pb_post_title",
  "lwp_divi_breadcrumbs",
  "et_pb_text",
  "text",
];

const row_pattern_condition_banner = [
  "et_pb_section",
  "et_pb_row",
  { type: "et_pb_column", attrs: { named: { type: "4_4" } } },
  "et_pb_image",
];

// rename: add text_image
const row_pattern_condition_content_2_cols_text_image = [
  "et_pb_section",
  { type: "et_pb_row", attrs: { named: { column_structure: "1_2,1_2" } } },
  { type: "et_pb_column", attrs: { named: { type: "1_2" } } },
  "et_pb_text",
  "text",
  { type: "et_pb_column", attrs: { named: { type: "1_2" } } },
  "et_pb_image",
];

const row_pattern_condition_content_grid_3 = [
  "et_pb_section",
  { type: "et_pb_row", attrs: { named: { column_structure: "1_3,1_3,1_3" } } },
  { type: "et_pb_column", attrs: { named: { type: "1_3" } } },
  "et_pb_image",
  "et_pb_text",
  "text",
  { type: "et_pb_column", attrs: { named: { type: "1_3" } } },
  "et_pb_image",
  "et_pb_text",
  "text",
  { type: "et_pb_column", attrs: { named: { type: "1_3" } } },
  "et_pb_image",
  "et_pb_text",
  "text",
];

// add blue color bg
const row_pattern_condition_content_2_cols_blue_banner = [
  "et_pb_section",
  { type: "et_pb_row", attrs: { named: { column_structure: "1_2,1_2" } } },
  {
    type: "et_pb_column",
    attrs: { named: { type: "1_2" } },
  },
  "et_pb_text",
  "text",
  "et_pb_button",
  { type: "et_pb_column", attrs: { named: { type: "1_2" } } },
  "et_pb_image",
];

const row_pattern_condition_content_2_slides = [
  "et_pb_section",
  { type: "et_pb_row", attrs: { named: { column_structure: "1_2,1_2" } } },
  {
    type: "et_pb_column",
    attrs: { named: { type: "1_2" } },
  },
  "et_pb_slider",
  "et_pb_slide",
  {
    type: "et_pb_column",
    attrs: { named: { type: "1_2" } },
  },
  "et_pb_slider",
  "et_pb_slide",
];

const row_pattern_condition_content_text = [
  "et_pb_section",
  "et_pb_row",
  { type: "et_pb_column", attrs: { named: { type: "4_4" } } },
  "et_pb_text",
  "text",
];

const row_pattern_condition_content_text2 = [
  "et_pb_section",
  "et_pb_row",
  { type: "et_pb_column", attrs: { named: { type: "4_4" } } },
  "et_pb_text",
  "text",
  "et_pb_text",
  "text",
];

const row_pattern_condition_cta = [
  "et_pb_section",
  "et_pb_row",
  { type: "et_pb_column", attrs: { named: { type: "4_4" } } },
  "et_pb_text",
  "text",
  "et_pb_button",
];

const row_pattern_condition_row_button = [
  "et_pb_section",
  "et_pb_row",
  { type: "et_pb_column", attrs: { named: { type: "4_4" } } },
  "et_pb_button",
];

const row_pattern_condition_testimonial = [
  "et_pb_section",
  "et_pb_row",
  { type: "et_pb_column", attrs: { named: { type: "4_4" } } },
  "et_pb_testimonial",
  "text",
];

const row_pattern_map = {
  condition_intro: {
    pattern: row_pattern_condition_intro,
    content: async (snapshot: any, processor: any) => {
      const text_option = getOptionText(snapshot, processor);
      return [
        {
          type: "condition_title",
          content: `<ConditionTitle id='${generateId()}' type='condition_title' options={{title: 'Fill in title'}} />`,
        },
        {
          type: "breadcrumb",
          content: `<Breadcrumb id='${generateId()}' type='breadcrumb' />`,
        },
        {
          type: "condition_content_text",
          content: `<ConditionContentText id='${generateId()}' type='condition_content_text' options={{${text_option}}} />`,
        },
      ];
    },
  },
  condition_banner: {
    pattern: row_pattern_condition_banner,
    content: (snapshot: any) => {
      const image_option = getOptionImage(snapshot);
      return [
        {
          type: "condition_banner",
          content: `<ConditionBanner id='${generateId()}' type='condition_banner' options={{${image_option}}} />`,
        },
      ];
    },
  },
  condition_content_2_cols_text_image: {
    pattern: row_pattern_condition_content_2_cols_text_image,
    content: (snapshot: any, processor: any) => {
      const text_option = getOptionText(snapshot, processor);
      const image_option = getOptionImage(snapshot);
      return [
        {
          type: "condition_content_2_cols_text_image",
          content: `<ConditionContent2ColsTextImage id='${generateId()}' type='condition_content_2_cols_text_image' options={{${text_option}, ${image_option}}} />`,
        },
      ];
    },
  },
  condition_content_grid_3: {
    pattern: row_pattern_condition_content_grid_3,
    content: (snapshot: any, processor: any) => {
      const texts_option = getOptionTexts(snapshot, processor);
      const images_option = getOptionImages(snapshot);
      return [
        {
          type: "condition_content_grid_3",
          content: `<ConditionContentGrid3 id='${generateId()}' type='condition_content_grid_3' options={{${texts_option}, ${images_option}}} />`,
        },
      ];
    },
  },
  condition_content_2_cols_blue_banner: {
    pattern: row_pattern_condition_content_2_cols_blue_banner,
    content: (snapshot: any, processor: any) => {
      const text_option = getOptionText(snapshot, processor);
      const button_option = getOptionButton(snapshot);
      const image_option = getOptionImage(snapshot);
      return [
        {
          type: "condition_content_2_cols_blue_banner",
          content: `<ConditionContent2ColsBlueBanner id='${generateId()}' type='condition_content_2_cols_blue_banner' options={{${text_option}, ${button_option}, ${image_option}}} />`,
        },
      ];
    },
  },
  condition_content_2_slides: {
    pattern: row_pattern_condition_content_2_slides,
    content: (snapshot: any, processor: any) => {
      const slider_option = getOptionSlider(snapshot);
      const slide_option = getOptionSlide(snapshot);
      return [
        {
          type: "condition_content_2_slides",
          content: `<ConditionContent2Slides id='${generateId()}' type='condition_content_2_slides' options={{${slider_option}, ${slide_option}}} />`,
        },
      ];
    },
  },
  condition_content_text: {
    pattern: row_pattern_condition_content_text,
    content: (snapshot: any, processor: any) => {
      const text_option = getOptionText(snapshot, processor);
      return [
        {
          type: "condition_content_text",
          content: `<ConditionContentText id='${generateId()}' type='condition_content_text' options={{${text_option}}} />`,
        },
      ];
    },
  },
  condition_content_text2: {
    pattern: row_pattern_condition_content_text2,
    content: (snapshot: any, processor: any) => {
      const text_option = getOptionText2(snapshot, processor);
      return [
        {
          type: "condition_content_text",
          content: `<ConditionContentText id='${generateId()}' type='condition_content_text' options={{${text_option}}} />`,
        },
      ];
    },
  },
  condition_content_cta: {
    pattern: row_pattern_condition_cta,
    content: (snapshot: any, processor: any) => {
      const text_option = getOptionText(snapshot, processor);
      const button_option = getOptionButton(snapshot);
      return [
        {
          type: "condition_content_cta",
          content: `<ConditionContentCTA id='${generateId()}' type='condition_content_cta' options={{${text_option}, ${button_option}}} />`,
        },
      ];
    },
  },
  condition_content_row_button: {
    pattern: row_pattern_condition_row_button,
    content: (snapshot: any, processor: any) => {
      const button_option = getOptionButton(snapshot);
      return [
        {
          type: "condition_content_row_button",
          content: `<ConditionContentRowButton id='${generateId()}' type='condition_content_row_button' options={{${button_option}}} />`,
        },
      ];
    },
  },
  condition_content_testimonial: {
    pattern: row_pattern_condition_testimonial,
    content: (snapshot: any, processor: any) => {
      const text_option = getOptionText(snapshot, processor);
      const testimonial_option = getOptionTestimonial(snapshot);
      return [
        {
          type: "condition_content_testimonial",
          content: `<ConditionContentTestimonial id='${generateId()}' type='condition_content_testimonial' options={{${testimonial_option}, ${text_option}}} />`,
        },
      ];
    },
  },
};

function getOptionTexts(snapshot: any, processor: any) {
  const text_content_items = snapshot.filter(
    (child: any) => child.type === "text",
  );
  if (text_content_items.length === 0) {
    throw new Error(`Text content item not found in condition_banner`);
  }
  const text_contents = text_content_items.map((e: any) =>
    processor.processSync(e.content),
  );
  const text_contents_option = text_contents
    .map((txt: any, i: number) => {
      const mdx = sanitizeMdxString(String(txt)).replace(/\\n$/, "") || "";
      const blocks = editor.tryParseMarkdownToBlocks(mdx);
      const value = JSON5.stringify(blocks);
      return `text${i}: ${value}`;
    })
    .join(", ");
  return text_contents_option;
}

function getOptionText(snapshot: any, processor: any) {
  const text_content_item = snapshot.find(
    (child: any) => child.type === "text",
  );
  if (text_content_item === undefined) {
    throw new Error(`Text content item not found`);
  }
  const text_content = processor.processSync(text_content_item.content);
  const mdx = sanitizeMdxString(String(text_content)).replace(/\\n$/, "") || "";
  const blocks = editor.tryParseMarkdownToBlocks(mdx);
  const value = JSON5.stringify(blocks);
  return `text: ${value}`;
}

function getOptionText2(snapshot: any, processor: any) {
  const items = snapshot.filter((child: any) => child.type === "text");
  if (items.length === 0) {
    throw new Error(`Text content item not found in condition_banner`);
  }
  const text_contents = items.map((e: any) => processor.processSync(e.content));
  const texts = text_contents
    .map(
      (value: any, i: number) =>
        sanitizeMdxString(String(value)).replace(/\\n$/, "") || "",
    ) // remove trailing newline
    .join("\\n"); // add newline (string literal escape sequence) for each text content item
  const blocks = editor.tryParseMarkdownToBlocks(texts);
  const value = JSON5.stringify(blocks);
  return `text: ${value}`;
}

function getOptionSlider(snapshot: any) {
  const slider = snapshot.find((child: any) => child.type === "et_pb_slider");
  if (slider === undefined) {
    throw new Error(`Slider content item not found`);
  }
  return `min_h: '${slider.attrs.named.min_height || ""}'`;
}

function getOptionSlide(snapshot: any) {
  const slides = snapshot.filter((child: any) => child.type === "et_pb_slide");
  if (slides.length === 0) {
    throw new Error(`Slide content item not found`);
  }
  const options = slides
    .map(
      (e: any, i: number) =>
        `bg_img${i}:{image_url: '${e.attrs.named.background_image || ""}'}, btn_text${i}:{link_text: '${sanitizeMdxString(e.attrs.named.button_text) || ""}', url${i}: '${sanitizeMdxString(e.attrs.named.button_link) || ""}'}, heading${i}: '${sanitizeMdxString(e.attrs.named.heading) || ""}'`,
    )
    .join(", ");
  return options;
}

function getOptionButton(snapshot: any) {
  const bt = snapshot.find((child: any) => child.type === "et_pb_button");
  if (bt === undefined) {
    throw new Error(`Button content item not found`);
  }
  return `link: {url: '${sanitizeMdxString(bt.attrs.named.button_url) || ""}', link_text: '${sanitizeMdxString(bt.attrs.named.button_text) || ""}'}`;
}

function getOptionImages(snapshot: any) {
  const imgs = snapshot.filter((child: any) => child.type === "et_pb_image");
  if (imgs.length === 0) {
    throw new Error(`Image content item not found`);
  }
  const image_contents_option = imgs
    .map(
      (e: any, i: number) =>
        `image${i}:{image_url: '${sanitizeMdxString(e.attrs.named.src) || ""}', alt_text: '${sanitizeMdxString(e.attrs.named.alt) || ""}'}, image_title${i}: '${sanitizeMdxString(e.attrs.named.title_text) || ""}', image_url${i}: '${sanitizeMdxString(e.attrs.named.url) || ""}'`,
    )
    .join(", ");
  return image_contents_option;
}

function getOptionImage(snapshot: any) {
  const img = snapshot.find((child: any) => child.type === "et_pb_image");
  if (img === undefined) {
    throw new Error(`Image content item not found`);
  }
  return `image:{image_url: '${sanitizeMdxString(img.attrs.named.src) || ""}', alt_text: '${sanitizeMdxString(img.attrs.named.alt) || ""}'}, image_title: '${sanitizeMdxString(img.attrs.named.title_text) || ""}', image_url: '${sanitizeMdxString(img.attrs.named.url) || ""}'`;
}

function getOptionTestimonial(snapshot: any) {
  const node = snapshot.find(
    (child: any) => child.type === "et_pb_testimonial",
  );
  if (node === undefined) {
    throw new Error(`Testimonial content item not found`);
  }
  return `image:{image_url: '${sanitizeMdxString(node.attrs.named.portrait_url) || ""}'}, url: '${sanitizeMdxString(node.attrs.named.url) || ""}'`;
}

function sanitizeMdxString(input: string) {
  if (!input) return "";

  return (
    input
      // 1. CRITICAL: Escape backslashes FIRST.
      // If you don't do this first, you will double-escape the \n you add later.
      .replace(/\\/g, "\\\\")

      // 2. Escape the apostrophe (Single Quote)
      .replace(/'/g, "\\'")

      // 3. Replace literal newlines with the string literal "\n"
      // .replace(/\n/g, "\\n")

      // 4. Remove Carriage Returns (often cause issues in Windows-generated text)
      .replace(/\r/g, "")
  );
}

async function findRowCandidate(snapshot: any[], processor: any) {
  const pattern = await matchPattern(snapshot, row_pattern_map, processor);
  if (pattern) {
    const component = {
      type: pattern.name,
      content: pattern.content,
    };
    return component;
  }
}

export async function transformShortcodes(input: any) {
  const processor = unified()
    .use(rehypeParse)
    .use(rehypeRemark, {
      // handlers: {
      //   a(state, node) {
      //     console.info("state", state, node);
      //     return node.children;
      //   },
      // },
    })
    .use(remarkStringify);
  const series: any = [];
  const candidates: any[] = [];

  async function buildCandidates(tag: string, snapshot: any[]) {
    console.info("row_snapshot --------", snapshot);
    if (tag === "et_pb_row") {
      const candidate = await findRowCandidate(snapshot, processor);
      console.info("--------- candidate", candidate);
      if (candidate) {
        candidates.push(candidate);
      }
    }
  }

  await asyncWalk(input, {
    async leave(node: any, parent: any, props: any, index?: number | null) {
      // console.log("walkNode", node, parent, props, index);
      // console.log("walkNode", node);
      switch (node.tag) {
        // case "et_pb_section": {
        //   const { attrs, children } = node;
        //   console.log("----- et_pb_section", [...series]);
        //   break;
        // }
        case "et_pb_row": {
          const { attrs, children } = node;
          const row_snapshot = flattenShortcodes(parent, index!);
          buildCandidates("et_pb_row", row_snapshot);
          break;
        }
        // case "et_pb_column": {
        //   const { attrs, children } = node;
        //   // console.log("et_pb_column", attrs, children);
        //   break;
        // }
        // case "et_pb_post_title": {
        //   const { attrs, children } = node;
        //   // console.log("et_pb_post_title", attrs, children);
        //   break;
        // }
        // case "lwp_divi_breadcrumbs": {
        //   const { attrs, children } = node;
        //   // console.log("lwp_divi_breadcrumbs", attrs, children);
        //   break;
        // }
        // case "et_pb_text": {
        //   const { attrs, children } = node;
        //   // console.log("----- et_pb_text", [...series]);
        //   break;
        // }
        // case "et_pb_image": {
        //   const { attrs, children } = node;
        //   // console.log("et_pb_image", attrs, children);
        //   break;
        // }
        // case "et_pb_button": {
        //   const { attrs, children } = node;
        //   // console.log("et_pb_button", attrs, children);
        //   break;
        // }
        // case "et_pb_slider": {
        //   const { attrs, children } = node;
        //   // console.log("et_pb_slider", attrs, children);
        //   break;
        // }
        // case "et_pb_slide": {
        //   const { attrs, children } = node;
        //   // console.log("et_pb_slide", attrs, children);
        //   break;
        // }
        // case "et_pb_testimonial": {
        //   const { attrs, children } = node;
        //   // console.log("et_pb_testimonial", attrs, children);
        //   break;
        // }
        // case "et_pb_icon": {
        //   // whatsapp icon
        //   const { attrs, children } = node;
        //   // console.log("et_pb_icon", attrs, children);
        //   break;
        // }
        // default: {
        //   // console.log("unknown", node);
        //   if (node.type === "text") {
        //     // const file = await processor.process(node.content);
        //     // console.log("-------", String(file));
        //   }
        // }
      }
    },
  });

  return candidates;
}

function flattenShortcodes(node: any, index: number) {
  const result: any[] = [{ type: node.tag, attrs: node.attrs }];

  function traverse(n: any) {
    if (!n) return;

    // TEXT NODE
    if (n.type === "text") {
      result.push({ type: "text", content: n.content });
      return;
    }

    // SHORTCODE NODE
    if (n.type === "shortcode") {
      result.push({
        type: n.tag,
        ...(n.attrs ? { attrs: n.attrs } : {}),
      });
    }

    // CHILDREN (if any)
    if (Array.isArray(n.children)) {
      n.children.forEach((child: any) => traverse(child));
    }
  }

  traverse(node.children[index]);
  return result;
}
