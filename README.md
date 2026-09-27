# FIN01-Insurance-Intelligence

-------------------------------------------------------------------------------------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------------------------------------------------------------------------------------

# CoverLens AI 🛡️

### AI-Powered Insurance Coverage & Treatment Cost Intelligence

> **Turn insurance policy fine print into evidence-backed financial clarity.**

[![Hackathon](https://img.shields.io/badge/Project-Hackathon-blue)](#)
[![AI](https://img.shields.io/badge/AI-RAG-green)](#)
[![Python](https://img.shields.io/badge/Backend-Python%20%7C%20FastAPI-yellow)](#)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js-black)](#)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-blue)](#)

---

## 📌 Overview

**CoverLens AI** is an AI-powered insurance policy intelligence assistant that helps users understand complex health-insurance policies and estimate potential treatment expenses and out-of-pocket costs.

Users can:

* Upload an insurance policy PDF
* Ask questions about their coverage
* Identify exclusions and waiting periods
* Find deductibles, co-payments and sub-limits
* Provide a treatment scenario
* Estimate treatment cost using structured reference data
* Estimate potential insurance coverage and out-of-pocket expenses
* See the exact policy page/section supporting an answer
* Identify missing information instead of receiving a fabricated answer

The system combines **document intelligence, Retrieval-Augmented Generation (RAG), structured policy information and deterministic financial calculations**.

---

# 🚨 Problem

Health-insurance policies contain important information about:

* Coverage
* Exclusions
* Waiting periods
* Deductibles
* Co-payments
* Room-rent limits
* ICU limits
* Disease/procedure sub-limits
* Eligibility conditions
* Claim requirements

Regulatory guidance from India's Insurance Regulatory and Development Authority of India (IRDAI) highlights the importance of understanding items such as waiting periods, exclusions, sub-limits, co-payments, room/ICU limits and eligible hospitals when evaluating health insurance.

The difficulty is that these conditions may be spread across multiple sections of a policy.

For example:

```text
Treatment
   ↓
Is the treatment covered?
   ↓
Has the waiting period been satisfied?
   ↓
Is the treatment excluded?
   ↓
Is there a sub-limit?
   ↓
Does a room-rent restriction apply?
   ↓
Is there a deductible?
   ↓
Is there a co-payment?
   ↓
How much sum insured remains?
   ↓
Potential covered amount
   ↓
Potential out-of-pocket cost
```

A simple chatbot response is therefore insufficient.

---

# 💡 Our Solution

CoverLens AI connects three sources of information:

```text
┌────────────────────┐
│ Insurance Policy   │
└─────────┬──────────┘
          │
          +
┌─────────▼──────────┐
│ Treatment Scenario │
└─────────┬──────────┘
          │
          +
┌─────────▼──────────┐
│ Cost Reference Data│
└─────────┬──────────┘
          │
          ▼
┌────────────────────────────┐
│ CoverLens AI Intelligence  │
└────────────┬───────────────┘
             │
      ┌──────┼────────┐
      ▼      ▼        ▼
  Coverage  Cost     Evidence
  Analysis  Estimate  & Sources
      │      │        │
      └──────┼────────┘
             ▼
       User Explanation
```

The goal is not simply to answer:

> "Is this covered?"

Instead, CoverLens aims to answer:

> **"Based on the policy evidence and information you provided, what appears to be covered, what could you potentially pay, which conditions affect the result, and what information is still missing?"**

---

# ✨ Key Features

## 1. 📄 Insurance Policy Upload

Users upload a health-insurance policy PDF.

The system processes the document and extracts relevant clauses.

### Information extracted may include:

* Sum insured
* Coverage
* Exclusions
* Waiting periods
* Deductibles
* Co-payments
* Room-rent limits
* ICU limits
* Procedure-specific limits
* Claim conditions

IRDAI's health-insurance regulatory framework includes requirements and guidance concerning important consumer-facing policy information.

---

# 2. 💬 Conversational Policy Q&A

Users can ask natural-language questions.

Example:

```text
Is knee replacement covered?

What is my room-rent limit?

Does my policy have a co-payment?

What is the waiting period?

What treatments are excluded?
```

The system retrieves relevant policy clauses before generating the answer.

---

# 3. 🔎 Evidence-Grounded Answers

A major design principle is:

> **Every important policy claim should be traceable to the uploaded policy.**

Example:

```text
Potentially Covered

The policy provides hospitalization coverage
subject to the applicable conditions.

Evidence:
Page 12
Section 6.3
```

The system can display the relevant policy text alongside the answer.

This approach is inspired by existing insurance-policy RAG work that combines retrieval with clause-level citations and refusal when the policy does not contain enough information.

---

# 4. 🏥 Treatment Scenario Analysis

Users can provide a treatment scenario.

Example:

```json
{
  "treatment": "Knee Replacement",
  "age": 56,
  "city": "Pune",
  "hospital_type": "Private",
  "hospital_stay_days": 5,
  "pre_existing_condition": false
}
```

The system uses this information together with the policy clauses.

---

# 5. 💰 Treatment Cost Estimation

The prototype uses a structured treatment-cost dataset.

Example:

```text
Estimated Treatment Cost

₹2.1 Lakh – ₹3.2 Lakh

Reference Estimate

₹2.55 Lakh
```

The prototype may use synthetic or reference cost data.

> **Important:** These estimates are not hospital quotations and should not be interpreted as guaranteed treatment prices.

---

# 6. 🧮 Potential Coverage & Out-of-Pocket Calculation

The system uses deterministic rules for financial calculations.

Example:

```text
Estimated treatment cost       ₹2,55,000

Eligible amount                ₹2,20,000
Deductible                       ₹10,000
Co-payment 10%                   ₹21,000

Potential insurer payment      ₹1,89,000
Potential out-of-pocket          ₹66,000
```

The LLM is **not responsible for performing the final financial arithmetic**.

Instead:

```text
AI
 ↓
Understand policy
 ↓
Retrieve evidence
 ↓
Explain conditions
 ↓
Deterministic Rules Engine
 ↓
Calculate
```

This separation reduces the risk of arithmetic errors and makes the calculation easier to test.

---

# 7. ⚠️ Missing Information Detection

The system should not fabricate an answer when important information is unavailable.

Example:

```text
Potential Coverage: Cannot determine reliably

Missing information:

• Remaining sum insured
• Confirmed hospital category
• Applicable room category
```

This is an important part of the system's responsible-AI design.

---

# 8. 🔄 Scenario Comparison

The system can demonstrate how the result changes when additional information is supplied.

Example:

```text
Scenario A

Pre-existing condition:
No

↓
Potentially covered
```

Then:

```text
Scenario B

Pre-existing condition:
Yes

↓
Applicable waiting-period condition identified
↓
Coverage assessment changes
```

This directly demonstrates the requirement that the answer should change when additional policy, treatment or patient information is supplied.

---

# 🧠 AI / RAG Architecture

CoverLens AI uses Retrieval-Augmented Generation rather than relying on an LLM's general knowledge for policy-specific answers.

```text
                 Insurance PDF
                      │
                      ▼
             Document Processing
                      │
                      ▼
              Page-aware Text
                      │
                      ▼
               Clause Extraction
                      │
             ┌────────┴────────┐
             ▼                 ▼
     Structured Policy      Embeddings
         Information        / Vectors
             │                 │
             └────────┬────────┘
                      ▼
                User Question
                      │
                      ▼
              Query Processing
                      │
             ┌────────┴────────┐
             ▼                 ▼
       Keyword Search      Vector Search
             │                 │
             └────────┬────────┘
                      ▼
               Hybrid Retrieval
                      │
                      ▼
              Relevant Clauses
                      │
                      ▼
                 LLM / RAG
                      │
                      ▼
             Structured Response
                      │
                      ▼
             Citation Validation
                      │
                      ▼
                 Final Answer
```

Hybrid search can combine PostgreSQL full-text search with vector similarity search; pgvector explicitly documents hybrid-search approaches alongside vector search.

---

# 🏗️ System Architecture

```text
┌─────────────────────────────────────┐
│                USER                 │
│                                     │
│ PDF | Questions | Treatment Details │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│          NEXT.JS FRONTEND           │
│                                     │
│ Upload | Chat | Scenario | Results  │
└──────────────────┬──────────────────┘
                   │
                   │ REST API
                   ▼
┌─────────────────────────────────────┐
│           FASTAPI BACKEND           │
│                                     │
│ Policy API                          │
│ Chat API                            │
│ Scenario API                        │
│ Cost API                            │
└───────────┬──────────┬──────────────┘
            │          │
            ▼          ▼
┌────────────────┐ ┌─────────────────┐
│ Document       │ │ RAG / Retrieval │
│ Processing     │ │                 │
│                │ │ Keyword Search  │
│ PDF Extraction │ │ Vector Search   │
│ OCR            │ │ Reranking       │
└───────┬────────┘ └────────┬────────┘
        │                   │
        └──────────┬────────┘
                   ▼
        ┌──────────────────────┐
        │ PostgreSQL           │
        │ + pgvector           │
        │                      │
        │ Policies             │
        │ Clauses              │
        │ Embeddings           │
        │ Scenarios            │
        │ Cost Data            │
        └───────────┬──────────┘
                    │
           ┌────────┴────────┐
           ▼                 ▼
   ┌───────────────┐  ┌───────────────┐
   │ LLM           │  │ Rules Engine  │
   │ Explanation   │  │ Calculation   │
   └───────┬───────┘  └───────┬───────┘
           │                  │
           └────────┬─────────┘
                    ▼
          Evidence-backed Result
```

---

# 🛠️ Technology Stack

| Layer         | Technology                        | Purpose                                |
| ------------- | --------------------------------- | -------------------------------------- |
| Frontend      | Next.js / React                   | User interface                         |
| Styling       | Tailwind CSS                      | Rapid UI development                   |
| Backend       | Python / FastAPI                  | REST APIs                              |
| Database      | PostgreSQL                        | Structured data                        |
| Vector Search | pgvector                          | Semantic retrieval                     |
| AI            | LLM / Gemini                      | Document understanding and explanation |
| Retrieval     | Hybrid search                     | Policy clause retrieval                |
| Storage       | Object storage                    | Policy documents                       |
| Deployment    | Vercel + managed backend/database | Hosting                                |

---

# 🗄️ Why PostgreSQL + pgvector?

The prototype uses PostgreSQL with pgvector instead of introducing a separate vector database.

pgvector is an open-source PostgreSQL extension supporting vector similarity search, including exact and approximate nearest-neighbor search, cosine distance, HNSW and IVFFlat indexes.

This lets the project store:

```text
Policy metadata
+
Policy clauses
+
Embeddings
+
Treatment costs
+
User scenarios
```

inside the same database.

For a 24-hour hackathon, this reduces infrastructure complexity.

---

# 📂 Project Structure

```text
coverlens-ai/
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── public/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── models/
│   │   ├── services/
│   │   ├── rag/
│   │   ├── rules/
│   │   └── utils/
│   │
│   ├── requirements.txt
│   └── main.py
│
├── data/
│   ├── treatment_costs.csv
│   └── sample_policy/
│
├── database/
│   └── schema.sql
│
├── docs/
│   └── architecture.md
│
├── .env.example
├── .gitignore
└── README.md
```

---

# 🚀 Getting Started

## Prerequisites

Install:

* Node.js 18+
* Python 3.10+
* PostgreSQL
* Git
* LLM API key

---

## 1. Clone Repository

```bash
git clone https://github.com/<your-username>/coverlens-ai.git

cd coverlens-ai
```

---

# 2. Backend Setup

```bash
cd backend

python -m venv venv
```

### Windows

```bash
venv\Scripts\activate
```

### macOS/Linux

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

---

# 3. Environment Variables

Create a `.env` file:

```env
DATABASE_URL=your_database_url
LLM_API_KEY=your_api_key
```

Do **not** commit `.env` or API keys to GitHub.

---

# 4. Start Backend

```bash
uvicorn main:app --reload
```

Backend:

```text
http://localhost:8000
```

---

# 5. Start Frontend

Open another terminal:

```bash
cd frontend

npm install

npm run dev
```

Frontend:

```text
http://localhost:3000
```

---

# 🔌 API Design

## Upload Policy

```http
POST /api/policies/upload
```

### Input

```text
multipart/form-data
policy_file=<PDF>
```

### Output

```json
{
  "policy_id": "policy_001",
  "status": "processed"
}
```

---

## Ask Policy Question

```http
POST /api/policies/{policy_id}/ask
```

### Input

```json
{
  "question": "Is knee replacement covered?"
}
```

### Output

```json
{
  "status": "potentially_covered",
  "answer": "The policy appears to cover...",
  "citations": [
    {
      "page": 12,
      "section": "6.3"
    }
  ],
  "missing_information": []
}
```

---

## Analyze Treatment

```http
POST /api/scenarios/analyze
```

### Input

```json
{
  "policy_id": "policy_001",
  "treatment": "Knee Replacement",
  "age": 56,
  "city": "Pune",
  "hospital_type": "Private",
  "pre_existing_condition": false
}
```

---

## Cost Estimate

```http
POST /api/estimate
```

### Output

```json
{
  "estimated_cost": {
    "low": 210000,
    "median": 255000,
    "high": 320000
  },
  "potential_insurer_payment": 189000,
  "potential_out_of_pocket": 66000,
  "confidence": "medium"
}
```

---

# 📊 Data Model

## Policies

```text
policies
---------
id
user_id
filename
insurer
policy_name
sum_insured
uploaded_at
```

## Policy Clauses

```text
policy_clauses
--------------
id
policy_id
page
section
category
text
embedding
```

## Treatment Costs

```text
treatment_costs
---------------
id
procedure
city
hospital_tier
low_cost
median_cost
high_cost
source_type
```

## Treatment Scenarios

```text
scenarios
---------
id
policy_id
procedure
patient_age
pre_existing
city
hospital_type
room_type
```

## Analysis Results

```text
analyses
--------
id
scenario_id
coverage_status
estimated_cost
estimated_covered
estimated_oop
confidence
missing_information
```

---

# 🧮 Coverage Calculation

The calculation engine should follow a transparent sequence.

```text
Treatment Cost
      ↓
Policy Eligible Amount
      ↓
Apply Sub-limit
      ↓
Apply Room/Eligibility Restrictions
      ↓
Apply Deductible
      ↓
Apply Co-payment
      ↓
Potential Insurer Payment
      ↓
Potential Out-of-Pocket Cost
```

A simplified conceptual formula is:

```text
Eligible Amount
= min(
    Treatment Cost,
    Policy Eligible Amount,
    Applicable Sub-limit
)
```

Then:

```text
After Deductible
= Eligible Amount - Deductible
```

And where a co-payment applies:

```text
Potential Insurer Payment
= Amount After Deductible × (1 - Co-pay %)
```

These are **simplified prototype calculations**. Actual insurance policies may contain additional rules and interactions.

---

# 🤖 Responsible AI Design

Insurance is a high-impact financial domain, so the system should prioritize evidence and uncertainty.

## 1. Ground responses in retrieved policy text

The LLM should receive relevant policy clauses rather than relying solely on its general knowledge.

---

## 2. Require citations

Policy-specific claims should have:

```text
Page
+
Section
+
Clause
```

---

## 3. Validate citations

Before displaying an answer:

```text
Does the citation exist?
        ↓
Does it belong to this policy?
        ↓
Was it retrieved for this question?
        ↓
Does the cited text support the claim?
```

---

## 4. Separate AI from calculations

```text
LLM
→ interpretation

Rules engine
→ financial calculation
```

---

## 5. Refuse unsupported questions

If the policy does not contain sufficient evidence:

```text
"I cannot determine this from the supplied policy."
```

Existing insurance-policy RAG research demonstrates this type of evidence-grounded answering and refusal behavior.

---

# 🔐 Security & Privacy

Potential sensitive information includes:

* Policy numbers
* Names
* Addresses
* Health information
* Medical conditions
* Financial information

The project should follow data-minimization principles and avoid using real patient information during demonstrations whenever possible.

### Security measures

* HTTPS
* Environment-based secrets
* Authentication
* Authorization
* Encrypted storage
* Access-controlled policy documents
* Input validation
* Document isolation between users
* No API keys in source code

---

# ⚠️ LLM Security

The application should also consider common LLM application risks.

OWASP's current GenAI security guidance identifies risks including:

* Prompt injection
* Sensitive information disclosure
* Supply-chain risks
* Data/model poisoning
* Improper output handling

among its LLM application risk categories.

### Prompt Injection Mitigation

Policy text must be treated as **untrusted data**, not as instructions to the AI system.

For example:

```text
Policy PDF
    ↓
Untrusted document content
    ↓
Extract relevant clauses
    ↓
LLM receives clauses as evidence
```

The system should never execute instructions embedded inside uploaded policy documents.

---

# 🧪 Evaluation

The prototype should have a manually verified evaluation set.

## Retrieval Accuracy

Question:

> "What is the room-rent limit?"

Check whether the correct clause appears in the top retrieved results.

---

## Citation Accuracy

Check:

```text
Claim
 ↓
Citation
 ↓
Actual policy text
```

The citation should actually support the claim.

---

## Calculation Accuracy

Create deterministic test cases.

Example:

```text
Input:
Eligible = ₹100,000
Deductible = ₹10,000
Co-pay = 10%

Expected:
₹81,000 insurer payment
```

The rules engine should consistently produce the expected result.

---

## Missing Information Detection

Test scenarios where:

* sum insured is unknown
* remaining sum insured is unknown
* waiting period is unknown
* room category is unknown
* hospital type is unknown

The system should identify these limitations rather than inventing values.

---

# 📈 Success Metrics

For the hackathon prototype, we recommend measuring:

| Metric                       |                         Target |
| ---------------------------- | -----------------------------: |
| Citation correctness         |       ≥90% on curated test set |
| Retrieval recall             | ≥90% top-5 on curated test set |
| Calculation accuracy         |    100% on deterministic tests |
| Unsupported-answer detection |                           High |
| Average response time        |                    <10 seconds |
| Scenario update correctness  |     100% on defined demo cases |

These are **prototype engineering targets**, not claims about production performance.

---

# 🏆 24-Hour Hackathon Scope

## P0 — Must Have

* [x] Policy PDF upload
* [x] PDF processing
* [x] Policy Q&A
* [x] Page/section citations
* [x] Treatment scenario
* [x] Treatment cost dataset
* [x] Coverage analysis
* [x] Out-of-pocket calculation
* [x] Missing-information detection

## P1 — If Time Allows

* [ ] Scenario comparison
* [ ] Policy summary dashboard
* [ ] Better visualization
* [ ] OCR support
* [ ] Multiple treatments

## P2 — Future

* [ ] Multiple policies
* [ ] Hospital integrations
* [ ] TPA integrations
* [ ] Real-time treatment pricing
* [ ] Claims workflow
* [ ] Multilingual support

---

# ⏱️ 24-Hour Development Plan

| Time   | Task                       |
| ------ | -------------------------- |
| 0–2h   | Project setup              |
| 2–5h   | PDF upload + extraction    |
| 4–8h   | Database + policy indexing |
| 5–10h  | RAG + citations            |
| 8–12h  | Treatment/cost engine      |
| 10–15h | Frontend integration       |
| 14–17h | Scenario comparison        |
| 16–19h | Testing                    |
| 19–21h | Deployment                 |
| 21–24h | Demo + presentation        |

---

# 👥 Team Structure

For a four-member team:

### 👨‍💻 Member 1 — Frontend

Responsible for:

* Next.js
* UI
* Chat
* Upload
* Scenario form
* Results dashboard

### 👨‍💻 Member 2 — Backend

Responsible for:

* FastAPI
* PostgreSQL
* APIs
* Document processing
* Database schema

### 🤖 Member 3 — AI/ML

Responsible for:

* RAG
* Embeddings
* Retrieval
* Prompting
* Citation validation

### 🧪 Member 4 — Integration/Product

Responsible for:

* Treatment-cost dataset
* Rules engine
* Testing
* UX
* Deployment
* Demo/presentation

---

# 🎬 Demo Flow

## Step 1 — Upload

Upload an insurance policy.

```text
Policy uploaded ✓
```

---

## Step 2 — Ask

```text
"Is knee replacement covered?"
```

System displays:

```text
Potentially Covered

Evidence:
Page 12
Section 6.3
```

---

## Step 3 — Treatment Scenario

```text
Treatment:
Knee Replacement

Age:
56

City:
Pune

Hospital:
Private
```

---

## Step 4 — Cost

```text
Estimated Cost

₹2.1L – ₹3.2L
```

---

## Step 5 — Financial Analysis

```text
Potential Insurer Payment
₹1.89L

Potential Out-of-Pocket
₹66K
```

---

## Step 6 — Change Information

Change:

```text
Pre-existing condition:
No → Yes
```

The system updates the relevant policy analysis.

---

## Step 7 — Missing Data

Remove:

```text
Remaining Sum Insured
```

System responds:

```text
Final payable amount cannot
be reliably determined.
```

---

# 🌐 Deployment

A simple hackathon deployment can use:

```text
Frontend
   ↓
Vercel

Backend
   ↓
Managed Python hosting

Database
   ↓
Managed PostgreSQL
+
pgvector
```

The exact hosting providers can be changed according to the team's existing accounts and experience.

---

# 📚 References

## Insurance Regulation & Policy

### IRDAI — Health Insurance

Official Insurance Regulatory and Development Authority of India resources:

[IRDAI Health Insurance / Health Department](https://irdai.gov.in/health-dept?utm_source=chatgpt.com)

### IRDAI — Master Circular on Health Insurance Business

The IRDAI circular repository lists the **Master Circular on Health Insurance Business dated 29 May 2024**.

[IRDAI Circulars](https://irdai.gov.in/circulars?utm_source=chatgpt.com)

---

# 🤖 AI & RAG References

### Insurance Policy RAG

An open-source insurance-policy QA project demonstrating hybrid retrieval, clause-level grounding, citations and refusal when the policy does not provide an answer.

[Insurance Policy RAG — GitHub](https://github.com/i-hridaysaha/insurance-policy-rag?utm_source=chatgpt.com)

---

# 🗄️ Vector Database

### pgvector

Open-source vector similarity search extension for PostgreSQL supporting exact/approximate nearest-neighbor search, HNSW, IVFFlat and hybrid search approaches.

[pgvector — GitHub](https://github.com/pgvector/pgvector?utm_source=chatgpt.com)

---

# 🔐 AI Security

### OWASP GenAI Security Project

OWASP's GenAI security guidance covers major LLM application risks including prompt injection and sensitive information disclosure.

[OWASP Top 10 for LLM Applications](https://genai.owasp.org/llm-top-10/?utm_source=chatgpt.com)

---

# 🏥 Healthcare Package Reference

### National Health Authority — PM-JAY

For future development of structured treatment/package reference data:

[National Health Authority — PM-JAY](https://pmjay.gov.in/?utm_source=chatgpt.com)

> Any package/rate information used in a prototype should be clearly distinguished from actual private-hospital treatment prices.

---

# 📜 Disclaimer

**CoverLens AI is a hackathon prototype for informational and demonstration purposes.**

The system does not provide:

* guaranteed insurance claim approval
* medical diagnosis
* legal advice
* financial advice
* guaranteed treatment prices
* guaranteed insurer reimbursement

Treatment-cost estimates may use synthetic or reference datasets and should not be interpreted as actual hospital quotations.

Coverage and out-of-pocket calculations are indicative and depend on the supplied information and the applicable policy terms, conditions, exclusions, waiting periods, limits, deductibles, co-payments and other requirements.

Users should verify important coverage and claim decisions with their insurer, policy documents and appropriate professionals.

---

# 🚀 Future Vision

CoverLens AI can evolve from a hackathon prototype into a broader insurance intelligence platform:

```text
                   CoverLens AI
                        │
        ┌───────────────┼────────────────┐
        ▼               ▼                ▼
     Policy          Treatment         Cost
   Intelligence     Intelligence     Intelligence
        │               │                │
        └───────────────┼────────────────┘
                        ▼
                Financial Planning
                        │
        ┌───────────────┼────────────────┐
        ▼               ▼                ▼
      Insurer          Hospital          TPA
        │               │                │
        └───────────────┼────────────────┘
                        ▼
                 Claims Ecosystem
```

---

# 🎯 Vision

> ## **Make insurance understandable before treatment becomes a financial surprise.**

### CoverLens AI

**From policy fine print → to evidence → to financial clarity.**

---

## 📖 Citation Summary

The primary external references used in this project README are:

1. **IRDAI** — Indian health-insurance regulatory material and Master Circular on Health Insurance Business.
2. **Insurance Policy RAG** — example of policy-grounded QA with hybrid retrieval, citations and refusal behavior.
3. **pgvector** — PostgreSQL vector similarity search and hybrid-search capabilities.
4. **OWASP GenAI Security Project** — LLM application security risks and mitigations.
5. **National Health Authority / PM-JAY** — public Indian healthcare package ecosystem reference.
