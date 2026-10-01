# Difference between HNSW (Hierarchical Navigable Small World) and IVFFlat vector indexes, and when to use an HNSW index on cosine distance (vector_cosine_ops). 

The core difference comes down to **how they organize vectors**: **HNSW builds a layered multi-lane highway graph**, while **IVFFlat groups vectors into neighborhood buckets**.

---

### HNSW vs. IVFFlat: The Simple Breakdown

* **HNSW (Multi-layer Graph):**
* **How it works:** Connects vectors in a skip-list-like graph. A search starts at top layers taking big "highway jumps," then zooms in on lower layers for exact matches.
* **Pros:** Blazing-fast search speed, high accuracy (recall), and you can build it on an empty table—it updates smoothly as you insert rows.
* **Cons:** Takes more RAM and builds more slowly.


* **IVFFlat (Clustering / Buckets):**
* **How it works:** Groups vectors into clusters (lists). A search checks only the centroid closest to your query and scans vectors inside that cluster.
* **Pros:** Tiny memory footprint and very fast index build time.
* **Cons:** Slower queries, lower recall, and **requires existing data** to calculate clusters (you cannot build an effective IVFFlat index on an empty table).



| Metric | HNSW | IVFFlat |
| --- | --- | --- |
| **Search Speed** | Very fast | Moderate |
| **Recall (Accuracy)** | High (95%+) | Medium (often misses border vectors) |
| **RAM Usage** | Higher | Low |
| **Build Time** | Slower | Fast |
| **Empty Table Build?** | Yes | No (needs data first) |

---

### When to Use HNSW with `vector_cosine_ops`

Use `USING hnsw (embedding vector_cosine_ops)` whenever:

1. **You are building LLM/RAG search:** Standard embedding models (OpenAI, Cohere, HuggingFace) evaluate semantic similarity via **angle (cosine)** rather than vector length.
2. **You want production-grade speed and accuracy:** HNSW is the default for production search because users care about latency and relevant results.
3. **Your data grows continuously:** You can create the HNSW index on day one, and it will index new row inserts automatically without needing complete retraining.

*Rule of thumb:* Default to **HNSW + `vector_cosine_ops**` unless you are severely constrained by server RAM.