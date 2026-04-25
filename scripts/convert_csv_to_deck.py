from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from pathlib import Path


DEFAULT_ENCODINGS = ("utf-8-sig", "utf-8", "cp932", "shift_jis")


def sanitize_deck_id(value: str) -> str:
    deck_id = re.sub(r"[^0-9A-Za-z_-]+", "-", value.strip())
    deck_id = deck_id.strip("-_")
    return deck_id or "deck"


def normalize_cell(value: str, separator: str) -> str:
    cleaned = value.replace("\ufeff", "").replace("\u3000", " ")
    parts = []

    for line in cleaned.splitlines():
        normalized = re.sub(r"\s+", " ", line).strip()
        if normalized:
            parts.append(normalized)

    return separator.join(parts)


def read_rows(
    input_path: Path,
    question_column: str,
    answer_column: str,
) -> tuple[list[dict[str, str]], str]:
    missing_columns: tuple[str, list[str]] | None = None

    for encoding in DEFAULT_ENCODINGS:
        try:
            with input_path.open("r", encoding=encoding, newline="") as handle:
                reader = csv.DictReader(handle)

                if not reader.fieldnames:
                    raise ValueError("CSV header row was not found.")

                column_map = {}
                for name in reader.fieldnames:
                    if name is None:
                        continue
                    column_map[name.replace("\ufeff", "").strip()] = name

                if question_column not in column_map or answer_column not in column_map:
                    missing_columns = (encoding, sorted(column_map))
                    continue

                actual_question = column_map[question_column]
                actual_answer = column_map[answer_column]
                rows: list[dict[str, str]] = []

                for row in reader:
                    rows.append(
                        {
                            "question": row.get(actual_question, "") or "",
                            "answer": row.get(actual_answer, "") or "",
                        }
                    )

                return rows, encoding
        except UnicodeDecodeError:
            continue

    if missing_columns is not None:
        encoding, columns = missing_columns
        raise ValueError(
            f"Required columns were not found with encoding {encoding}: "
            f"{question_column!r}, {answer_column!r}. Available columns: {columns}"
        )

    raise ValueError(
        "The CSV file could not be decoded. Tried encodings: "
        + ", ".join(DEFAULT_ENCODINGS)
    )


def build_deck(
    rows: list[dict[str, str]],
    deck_id: str,
    title: str,
    description: str,
    lang: str,
    version: int,
    separator: str,
) -> dict[str, object]:
    items = []

    for index, row in enumerate(rows, start=1):
        question = normalize_cell(row["question"], separator)
        answer = normalize_cell(row["answer"], separator)

        if not question or not answer:
            continue

        items.append(
            {
                "id": f"{deck_id}-{index:04d}",
                "question": question,
                "answer": answer,
            }
        )

    return {
        "id": deck_id,
        "title": title,
        "description": description,
        "version": version,
        "lang": lang,
        "items": items,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert a CSV file with word/meaning columns into a deck JSON file."
    )
    parser.add_argument("input", help="Path to the source CSV file.")
    parser.add_argument(
        "-o",
        "--output",
        help="Path to the output JSON file. Defaults to public/decks/<deck-id>.json.",
    )
    parser.add_argument(
        "--deck-id",
        help="Deck id to write into JSON. Defaults to the output file stem or input file stem.",
    )
    parser.add_argument(
        "--title",
        help="Deck title. Defaults to the input file stem.",
    )
    parser.add_argument(
        "--description",
        help="Deck description. Defaults to '<input filename> から変換した単語帳'.",
    )
    parser.add_argument(
        "--lang",
        default="en-ja",
        help="Deck language code. Default: en-ja.",
    )
    parser.add_argument(
        "--version",
        type=int,
        default=1,
        help="Deck version. Default: 1.",
    )
    parser.add_argument(
        "--question-column",
        default="単語",
        help="Column name to use for question text. Default: 単語.",
    )
    parser.add_argument(
        "--answer-column",
        default="意味",
        help="Column name to use for answer text. Default: 意味.",
    )
    parser.add_argument(
        "--separator",
        default=" / ",
        help="Separator used when a cell contains multiple lines. Default: ' / '.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    input_path = Path(args.input)

    if not input_path.is_file():
        print(f"Input CSV was not found: {input_path}", file=sys.stderr)
        return 1

    output_stem = Path(args.output).stem if args.output else input_path.stem
    deck_id = sanitize_deck_id(args.deck_id or output_stem)
    output_path = Path(args.output) if args.output else Path("public/decks") / f"{deck_id}.json"
    title = args.title or input_path.stem
    description = args.description or f"{input_path.name} から変換した単語帳"

    try:
        rows, encoding = read_rows(
            input_path,
            question_column=args.question_column,
            answer_column=args.answer_column,
        )
        deck = build_deck(
            rows=rows,
            deck_id=deck_id,
            title=title,
            description=description,
            lang=args.lang,
            version=args.version,
            separator=args.separator,
        )
    except ValueError as error:
        print(str(error), file=sys.stderr)
        return 1

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(deck, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(
        f"Converted {len(deck['items'])} items from {input_path} "
        f"({encoding}) to {output_path}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
