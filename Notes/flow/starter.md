# Initial Installations:
- First install next.js using command from docs (I could write here but they might change it in the future)
- Then install the prisma using docs
- Write the prisma schema (don't forget to set the DATABASE_URL in your .env file), and don't directly migrate to the db command, instead just create the migration file using `npx prisma migrate dev --name init` (could be wrong), then write the pgvector line in the migration file at the top, and the hnsw index at the end of file, then save it to the online db using `npx prisma migrate deploy` (could be wrong)
- Install the nextAuth or auth.js using docs, and set the env variables in your .env file
- Then install the @google/gemini package using docs, and set the env variables in your .env file. Then do your work for creating embeddings or error sanitization, and then save the embeddings to the db using prisma client. Then you can use the embeddings for your search queries using the hnsw index.