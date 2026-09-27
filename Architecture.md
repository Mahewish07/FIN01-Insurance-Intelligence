# CoverLens AI — System Architecture

## 1. Overview

CoverLens AI is an evidence-grounded insurance intelligence system that combines:

* Insurance policy document processing
* Clause-level retrieval
* Retrieval-Augmented Generation (RAG)
* Treatment scenario analysis
* Structured treatment-cost data
* Deterministic financial calculations
* Evidence and citation validation
* Missing-information detection

The central architectural principle is:

> **AI interprets and retrieves policy information; deterministic software performs financial calculations.**

---

# 2. High-Level Architecture

```text
                         USER
                           │
                           ▼
                ┌────────────────────┐
                │   Next.js Frontend │
                │                    │
                │ • PDF Upload       │
                │ • Policy Chat      │
                │ • Scenario Form    │
                │ • Cost Dashboard   │
                └─────────┬──────────┘
                          │
                          │ REST API
                          ▼
                ┌────────────────────┐
                │   FastAPI Backend  │
                └─────────┬──────────┘
                          │
             ┌────────────┼────────────┐
             │            │            │
             ▼            ▼            ▼
       Document       RAG Engine    Rules Engine
       Processor
             │            │            │
             ▼            ▼            │
       Clause Store   Retrieval        │
             │            │            │
             └──────┬─────┘            │
                    ▼                  │
             PostgreSQL               │
             + pgvector               │
                    │                  │
                    └────────┬─────────┘
                             ▼
                     Evidence + Result
                             │
                             ▼
                           User
```

---

# 3. Frontend Architecture

The frontend is built using **Next.js and React**.

## Main screens

```text
Dashboard
│
├── Upload Policy
│
├── Policy Summary
│
├── Ask Your Policy
│
├── Treatment Scenario
│
├── Cost Estimate
│
├── Coverage Analysis
│
└── Scenario Comparison
```

## Responsibilities

The frontend handles:

* PDF upload
* User questions
* Treatment scenario input
* Result visualization
* Citation display
* Cost breakdown
* Missing-information warnings
* Scenario comparison

The frontend does **not** perform insurance calculations.

---

# 4. Backend Architecture

The backend uses **Python + FastAPI**.

Suggested service structure:

```text
backend/
│
├── main.py
│
├── api/
│   ├── policies.py
│   ├── chat.py
│   ├── scenarios.py
│   └── estimates.py
│
├── services/
│   ├── document_processor.py
│   ├── policy_parser.py
│   ├── retrieval.py
│   ├── citation_validator.py
│   └── cost_service.py
│
├── rag/
│   ├── embeddings.py
│   ├── retriever.py
│   ├── reranker.py
│   └── prompts.py
│
├── rules/
│   ├── coverage.py
│   ├── deductible.py
│   ├── copay.py
│   └── sublimits.py
│
└── models/
    ├── policy.py
    ├── clause.py
    ├── scenario.py
    └── analysis.py
```

---

# 5. Document Processing Pipeline

When a user uploads a policy:

```text
PDF
 │
 ▼
File Validation
 │
 ▼
Text Extraction
 │
 ▼
Page Detection
 │
 ▼
Section Detection
 │
 ▼
Clause Segmentation
 │
 ▼
Metadata Generation
 │
 ▼
Embedding Generation
 │
 ▼
PostgreSQL + pgvector
```

Each clause should retain its original document location.

Example:

```json
{
  "clause_id": "clause_021",
  "policy_id": "policy_001",
  "page": 12,
  "section": "6.3",
  "category": "waiting_period",
  "text": "..."
}
```

This enables page-level evidence.

---

# 6. Clause Classification

Relevant clauses can be classified into categories such as:

```text
coverage
exclusion
waiting_period
deductible
copayment
room_rent
icu_limit
sublimit
eligibility
claim_requirement
network_hospital
renewal
other
```

Classification can be performed using rules, an LLM, or a combination.

For the hackathon, a hybrid approach is recommended:

```text
Keyword / Pattern Detection
          +
LLM Classification
          ↓
Final Clause Category
```

---

# 7. RAG Pipeline

## Query Flow

```text
User Question
      │
      ▼
Question Normalization
      │
      ▼
Query Embedding
      │
      ├───────────────┐
      ▼               ▼
Keyword Search    Vector Search
      │               │
      └───────┬───────┘
              ▼
        Hybrid Results
              │
              ▼
           Reranking
              │
              ▼
       Top Relevant Clauses
              │
              ▼
         LLM Context
              │
              ▼
       Structured Answer
```

---

# 8. Hybrid Retrieval

CoverLens AI should combine two retrieval strategies.

## Keyword Retrieval

Useful for exact terms such as:

```text
"co-payment"
"room rent"
"waiting period"
"ICU"
"deductible"
```

## Vector Retrieval

Useful when the user's wording differs from the policy wording.

Example:

```text
User:
"How much do I have to pay myself?"

Policy:
"Insured shall bear 10% of admissible expenses."
```

Semantic retrieval can connect these concepts.

---

# 9. Answer Generation

The LLM should receive:

```text
System Instructions
+
User Question
+
Relevant Policy Clauses
+
Scenario Information
+
Calculation Results
```

The model should return structured data.

Example:

```json
{
  "answer_status": "partially_supported",
  "coverage_status": "potentially_covered",
  "summary": "The treatment appears to be covered subject to the identified conditions.",
  "factors": [
    "Waiting period",
    "Applicable sub-limit"
  ],
  "missing_information": [
    "Remaining sum insured"
  ],
  "citations": [
    {
      "page": 12,
      "section": "6.3",
      "clause_id": "clause_021"
    }
  ]
}
```

---

# 10. Citation Validation

Citations are validated before the final answer is shown.

```text
Generated Citation
       │
       ▼
Does clause exist?
       │
       ▼
Does clause belong to policy?
       │
       ▼
Does page number match?
       │
       ▼
Does retrieved text support claim?
       │
       ├── YES → Display
       │
       └── NO → Remove / Flag
```

This reduces unsupported policy claims.

---

# 11. Treatment Scenario Engine

A scenario can contain:

```json
{
  "procedure": "Knee Replacement",
  "age": 56,
  "city": "Pune",
  "hospital_type": "Private",
  "room_type": "Single",
  "pre_existing_condition": false,
  "hospital_stay_days": 5
}
```

The scenario is combined with policy constraints.

```text
Treatment
   +
Patient Information
   +
Hospital Information
   +
Policy Rules
   ↓
Coverage Analysis
```

---

# 12. Treatment Cost Engine

Treatment costs should be represented as structured data.

Example:

```text
procedure
city
hospital_tier
low_cost
median_cost
high_cost
source_type
source_reference
```

Example:

```json
{
  "procedure": "knee_replacement",
  "city": "Pune",
  "hospital_tier": "mid",
  "low_cost": 180000,
  "median_cost": 250000,
  "high_cost": 350000,
  "source_type": "synthetic"
}
```

Synthetic data must be clearly labelled.

---

# 13. Deterministic Financial Engine

The financial engine should not depend on free-form LLM reasoning.

Conceptual flow:

```text
Treatment Cost
      │
      ▼
Policy Eligibility
      │
      ▼
Applicable Sub-limit
      │
      ▼
Eligible Amount
      │
      ▼
Deductible
      │
      ▼
Co-payment
      │
      ▼
Potential Insurer Payment
      │
      ▼
Potential Out-of-Pocket
```

Example:

```text
Treatment Cost          ₹255,000
Eligible Amount         ₹220,000
Deductible               ₹10,000
Co-payment                   10%
```

Calculation:

```text
Amount after deductible
= ₹220,000 - ₹10,000
= ₹210,000

Co-payment
= 10% × ₹210,000
= ₹21,000

Potential insurer payment
= ₹210,000 - ₹21,000
= ₹189,000

Potential out-of-pocket
= ₹255,000 - ₹189,000
= ₹66,000
```

This is an illustrative example only.

---

# 14. Missing Information Engine

The system should explicitly identify missing variables.

Example:

```text
Required Information
│
├── Remaining Sum Insured ✓
├── Waiting Period Status ✓
├── Room Category ✓
├── Hospital Category ✓
└── Deductible ✓
```

If a required variable is unavailable:

```text
Coverage Result:
Insufficient Information
```

The system should not substitute a guessed value.

---

# 15. Confidence Model

Instead of presenting an unexplained confidence percentage, the system can describe confidence using separate dimensions.

```text
Evidence Strength
Calculation Completeness
Cost Data Quality
Scenario Completeness
```

Example:

```text
Overall assessment: Medium confidence

Evidence strength: High
Calculation completeness: Medium
Cost data quality: Medium
Scenario completeness: Low
```

This makes uncertainty more interpretable.

---

# 16. Database Architecture

PostgreSQL stores structured information.

## Main tables

```text
users
policies
policy_clauses
policy_embeddings
treatment_costs
scenarios
analyses
citations
```

### Policy

```text
policies
--------
id
filename
insurer
policy_name
sum_insured
uploaded_at
```

### Clause

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

### Scenario

```text
scenarios
---------
id
policy_id
procedure
age
city
hospital_type
room_type
pre_existing_condition
```

---

# 17. API Architecture

## Policy Upload

```http
POST /api/policies/upload
```

## Ask Question

```http
POST /api/policies/{policy_id}/ask
```

## Analyze Scenario

```http
POST /api/scenarios/analyze
```

## Estimate Cost

```http
POST /api/estimate
```

## Get Policy Summary

```http
GET /api/policies/{policy_id}/summary
```

---

# 18. Security Architecture

```text
User
 │
 ▼
HTTPS
 │
 ▼
Authentication
 │
 ▼
Authorization
 │
 ▼
API
 │
 ├── Policy Access Check
 │
 ├── Input Validation
 │
 └── File Validation
 │
 ▼
Secure Storage
```

Important controls:

* File type validation
* File size limits
* Authentication
* Authorization
* API-key protection
* Secure environment variables
* User-level policy isolation
* No sensitive data in logs

---

# 19. LLM Security

Uploaded documents should be considered untrusted input.

```text
Uploaded Policy
      ↓
Untrusted Content
      ↓
Extraction
      ↓
Relevant Clauses
      ↓
LLM Context
```

Instructions contained inside a document should never override system instructions.

Potential risks include:

* Prompt injection
* Sensitive information disclosure
* Malicious documents
* Unsupported generated claims
* Data leakage

OWASP's GenAI security guidance provides a useful reference for these risks.

---

# 20. Failure Handling

## Invalid PDF

```text
Unable to process document.
Please upload a valid policy PDF.
```

## No Relevant Clause

```text
The supplied policy does not contain
sufficient evidence to answer this question.
```

## Missing Scenario Information

```text
Additional information required:
• Room category
• Remaining sum insured
```

## Cost Data Unavailable

```text
No reference cost data is available
for this treatment and location.
```

---

# 21. Hackathon MVP

The minimum viable implementation should include:

```text
✓ PDF Upload
✓ Text Extraction
✓ Clause Retrieval
✓ Policy Q&A
✓ Page Citations
✓ Treatment Scenario
✓ Cost Dataset
✓ Rules Engine
✓ OOP Estimate
✓ Missing Information
✓ Scenario Change
✓ Web Dashboard
```

Avoid implementing during the 24-hour hackathon:

```text
✗ Real insurance claim submission
✗ Hospital booking
✗ Real insurer integration
✗ Production medical decision-making
✗ Large-scale pricing system
✗ Custom foundation-model training
```

---

# 22. References

* IRDAI — Health Insurance resources
* IRDAI — Master Circular on Health Insurance Business
* pgvector — PostgreSQL vector similarity search
* OWASP GenAI Security Project
* Insurance Policy RAG — example open-source policy RAG implementation

See `DATA_SOURCES.md` for detailed source and dataset provenance.

---

# 23. Core Design Principle

The architecture follows four layers:

```text
                 COVERLENS AI
                      │
       ┌──────────────┼──────────────┐
       ▼              ▼              ▼
   Evidence        Context         Cost
   Retrieval      Analysis       Intelligence
       │              │              │
       └──────────────┼──────────────┘
                      ▼
              Deterministic Rules
                      │
                      ▼
             Explainable Result
```

> **Retrieve evidence. Understand context. Calculate deterministically. Explain transparently.**
