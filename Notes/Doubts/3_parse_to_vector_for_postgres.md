
# ```src: src/lib/error-repo.ts, line 29```
# Do we need to save the embeddings as a string? by using json.stringify - why this only? can it not store directly the array or number[] ?

**In PostgreSQL, a vector is stored as pure floating-point binary bytes in disk memory, not as text.**

The reason you have to pass it through `JSON.stringify()` in TypeScript is because of a type-mismatch problem between **JavaScript arrays, Prisma, and PostgreSQL's wire protocol**.

---

### 1. What happens if you try to pass `number[]` directly?

If you try to write:

```ts
const embedding: number[] = [0.012, -0.043, 0.912];

await prisma.$executeRaw`
  INSERT INTO "ErrorLog" ("embedding") VALUES (${embedding}::vector);
`;

```

PostgreSQL crashes with:

```text
ERROR: cannot cast type double precision[] to vector

```

Or Prisma throws a serialization error before the query even reaches the database.

#### Why?

* In JavaScript/TypeScript, `[0.1, 0.2]` is an array of floating-point numbers.
* Prisma translates a JavaScript `number[]` into PostgreSQL's native array type: `double precision[]` (syntax: `ARRAY[0.1, 0.2]`).
* PostgreSQL's `vector` extension **does not have an automatic type-cast from `double precision[]` to `vector**`.
* PostgreSQL's vector parser specifically expects the standard vector literal syntax: `'[0.1, 0.2, 0.3]'` (a formatted string enclosed in brackets with comma-separated numbers).

---

### 2. Why `JSON.stringify(embedding)` is the standard solution

When you run `JSON.stringify([0.1, -0.4, 0.9])`, it outputs:

```text
"[0.1,-0.4,0.9]"

```

* This matches PostgreSQL's input format for vectors: `'[0.1,-0.4,0.9]'::vector`.
* When PostgreSQL receives that string with the `::vector` cast, its internal C engine parses the numbers and stores them in the column as compact **4-byte floats per dimension** (taking up ~3 KB of binary storage for a 768-dimension vector).
* The string representation only exists for a fraction of a millisecond while passing the data over the network cable from Node.js to PostgreSQL; once inside PostgreSQL, **it is stored as a vector, not a string**.

---

### 3. Can you avoid `JSON.stringify()`?

Yes, but only if you install the official helper library **`pgvector/pgvector-node`**:

```bash
npm install pgvector

```

Then you use its serializer `pgvector.toSql()`:

```ts
import pgvector from "pgvector";

const vectorInput = pgvector.toSql([0.1, -0.4, 0.9]); // Returns '[0.1,-0.4,0.9]'

```

`pgvector.toSql(arr)` does the exact same thing behind the scenes: it formats the JavaScript `number[]` into the bracketed string representation that PostgreSQL's parser expects.

Using `JSON.stringify(embedding)` achieves this with zero extra dependencies and is the standard way to feed vectors into `prisma.$executeRaw` and `prisma.$queryRaw`.