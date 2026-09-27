# CoverLens AI — Data Sources & References

## 1. Purpose

This document records the external references, datasets and data assumptions used by CoverLens AI.

The goal is to clearly distinguish:

1. Official regulatory information
2. Technical references
3. Research/inspiration
4. Public healthcare information
5. Synthetic prototype data
6. Future data sources

This distinction is important because **synthetic demonstration data must not be presented as real-world insurance or hospital pricing**.

---

# 2. Regulatory Reference

## 2.1 Insurance Regulatory and Development Authority of India (IRDAI)

**Organization:** Insurance Regulatory and Development Authority of India

IRDAI is the statutory insurance regulator in India.

The project uses IRDAI resources to understand relevant health-insurance concepts such as:

* Waiting periods
* Exclusions
* Co-payments
* Sub-limits
* Room-rent restrictions
* ICU restrictions
* Eligible hospitals
* Customer-facing policy information

### Official Source

IRDAI Health Department:

https://irdai.gov.in/health-dept

### Master Circular

The IRDAI circular repository includes the:

**Master Circular on Health Insurance Business dated 29 May 2024.**

Official IRDAI circular repository:

https://irdai.gov.in/circulars

### Usage in CoverLens

IRDAI material is used as a **regulatory and conceptual reference**.

It is not used to determine the coverage of an individual user's insurance policy.

The uploaded policy remains the primary source for policy-specific analysis.

---

# 3. Policy Document Data

## Primary Policy Source

For a user-specific analysis, the primary source is:

```text
User-uploaded insurance policy
```

The system extracts information directly from the uploaded document.

Examples include:

```text
Policy clauses
Coverage conditions
Exclusions
Waiting periods
Deductibles
Co-payments
Sub-limits
Room-rent conditions
Claim requirements
```

---

# 4. Policy Evidence Hierarchy

CoverLens uses the following priority order:

```text
1. Uploaded policy document
           ↓
2. Structured extracted clauses
           ↓
3. Retrieved evidence
           ↓
4. Deterministic calculation
           ↓
5. General regulatory/technical references
```

For a policy-specific question, general web information should **not override the uploaded policy**.

---

# 5. Treatment Cost Dataset

## Hackathon Prototype

The initial prototype may use a small structured dataset containing treatment-cost ranges.

Example schema:

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

```csv
procedure,city,hospital_tier,low_cost,median_cost,high_cost,source_type
knee_replacement,Pune,mid,180000,250000,350000,synthetic
appendectomy,Pune,mid,60000,85000,120000,synthetic
cataract,Pune,mid,30000,45000,70000,synthetic
```

### Important

The above values are **illustrative synthetic values** for demonstrating the system architecture.

They should not be presented as:

* Official hospital prices
* Insurer-approved rates
* Government rates
* Guaranteed treatment costs
* Current market averages

---

# 6. Future Cost Data Sources

A production version could incorporate properly licensed and documented sources such as:

* Public healthcare package datasets
* Government healthcare schemes
* Hospital-published price lists
* Licensed healthcare datasets
* Partner hospital data
* Aggregated historical claims data where legally permitted

Each record should retain provenance.

Recommended fields:

```text
source_name
source_url
retrieved_at
geographic_scope
hospital_scope
valid_from
valid_until
license
source_type
```

---

# 7. National Health Authority / PM-JAY

The National Health Authority operates the Pradhan Mantri Jan Arogya Yojana (PM-JAY).

Official website:

https://pmjay.gov.in/

PM-JAY information can be useful for understanding structured healthcare package concepts.

However:

> PM-JAY package rates must not automatically be treated as private-hospital market prices.

If PM-JAY data is incorporated into a future version, the application should clearly identify it as:

```text
Government healthcare package/rate information
```

rather than a universal treatment-cost estimate.

---

# 8. AI / RAG Technical Reference

## Insurance Policy RAG

An open-source project demonstrating an insurance-policy RAG workflow:

https://github.com/i-hridaysaha/insurance-policy-rag

The project is relevant to CoverLens because it demonstrates concepts including:

* Policy document retrieval
* Hybrid retrieval
* Clause-aware processing
* Evidence-based responses
* Citation handling
* Answerability/refusal behavior

It is a **technical reference**, not a source of insurance coverage rules.

---

# 9. Vector Search Reference

## pgvector

Official repository:

https://github.com/pgvector/pgvector

pgvector provides vector similarity search capabilities inside PostgreSQL.

CoverLens can use it for:

```text
Policy clause embeddings
       ↓
Vector search
       ↓
Relevant policy clauses
```

It can also be combined with PostgreSQL keyword/full-text search for hybrid retrieval.

---

# 10. LLM Reference

The project can use an LLM API for:

* Document understanding
* Clause classification
* Query understanding
* Explanation generation
* Structured response generation

If Google Gemini is selected, official documentation is available at:

https://ai.google.dev/gemini-api/docs

The exact model should be recorded in the project's environment/configuration documentation.

Example:

```text
LLM_PROVIDER=Google
LLM_MODEL=<model-name>
```

Do not hard-code API credentials into the repository.

---

# 11. AI Security Reference

## OWASP GenAI Security Project

Official source:

https://genai.owasp.org/llm-top-10/

This reference is used to understand risks including:

* Prompt injection
* Sensitive information disclosure
* Improper output handling
* Data/model poisoning
* Supply-chain risks

CoverLens treats uploaded policy documents as untrusted input.

---

# 12. Data Classification

The project uses the following data categories.

| Data           | Type          | Example              |
| -------------- | ------------- | -------------------- |
| Policy PDF     | User-provided | Insurance policy     |
| Policy clauses | Extracted     | Coverage clause      |
| Treatment data | Prototype     | Procedure cost       |
| Scenario data  | User-provided | Age, city, treatment |
| Embeddings     | Derived       | Clause vector        |
| Analysis       | Derived       | Coverage assessment  |

---

# 13. Synthetic Data Policy

Synthetic data should be clearly labelled.

Recommended field:

```text
source_type = synthetic
```

Example:

```json
{
  "procedure": "appendectomy",
  "city": "Pune",
  "median_cost": 85000,
  "source_type": "synthetic"
}
```

The UI should display:

> **Illustrative estimate based on prototype reference data.**

---

# 14. Data Provenance

Every external dataset should ideally contain:

```text
source_name
source_url
retrieved_at
source_type
geography
validity_period
license
notes
```

Example:

```json
{
  "source_name": "Example Dataset",
  "source_url": "https://example.org/data",
  "retrieved_at": "2026-09-27",
  "source_type": "public",
  "geography": "India",
  "validity_period": "2026",
  "license": "Example License"
}
```

---

# 15. Data Quality

Each data source should be evaluated for:

### Accuracy

Does the source provide reliable information?

### Freshness

How recently was the data updated?

### Geographic relevance

Does it apply to the user's city/region?

### Population relevance

Does it represent the relevant patient/hospital population?

### Coverage

Does it include the required treatment or procedure?

### Licensing

Can the data legally be used by the application?

---

# 16. Data Limitations

Treatment cost varies based on factors including:

* City
* Hospital
* Hospital tier
* Doctor/specialist
* Procedure complexity
* Room category
* Patient condition
* Length of stay
* Consumables
* Complications
* Additional procedures

Therefore, CoverLens should provide a **range** rather than pretending that one number represents the actual final bill.

---

# 17. Policy Interpretation Limitations

Insurance policies can contain interactions between multiple clauses.

For example:

```text
Coverage
+
Waiting Period
+
Exclusion
+
Sub-limit
+
Room Restriction
+
Deductible
+
Co-payment
```

Therefore, retrieving a single clause may not always be sufficient.

The system should retrieve multiple related clauses when necessary.

---

# 18. Source Hierarchy

For a policy-specific question:

```text
Highest Priority
       │
       ▼
Uploaded Policy
       │
       ▼
Relevant Policy Clauses
       │
       ▼
Policy Metadata
       │
       ▼
Structured Calculation
       │
       ▼
Regulatory References
       │
       ▼
General Knowledge
       │
       ▼
Lowest Priority
```

The system should not use general internet information to override explicit policy wording.

---

# 19. Reference List

### Regulatory

**Insurance Regulatory and Development Authority of India (IRDAI)**
https://irdai.gov.in/

**IRDAI Health Department**
https://irdai.gov.in/health-dept

**IRDAI Circulars**
https://irdai.gov.in/circulars

---

### Healthcare

**National Health Authority — PM-JAY**
https://pmjay.gov.in/

---

### AI / RAG

**Insurance Policy RAG — GitHub**
https://github.com/i-hridaysaha/insurance-policy-rag

**pgvector — GitHub**
https://github.com/pgvector/pgvector

**Google Gemini API Documentation**
https://ai.google.dev/gemini-api/docs

---

### Security

**OWASP GenAI Security Project**
https://genai.owasp.org/llm-top-10/

---

# 20. Citation Policy for the Project

When presenting information in the application:

### Policy claims

Cite:

```text
Policy page
Policy section
Policy clause
```

### Regulatory claims

Cite:

```text
IRDAI source
Document title
Relevant section
```

### Cost claims

Cite:

```text
Dataset/source
Geographic scope
Data date
```

### Synthetic estimates

Clearly display:

```text
Synthetic / Illustrative
```

---

# 21. Recommended UI Labels

For transparency, use labels such as:

```text
Policy Evidence
```

```text
Illustrative Cost Estimate
```

```text
Potential Insurer Payment
```

```text
Potential Out-of-Pocket Cost
```

```text
Missing Information
```

```text
Confidence / Evidence Strength
```

Avoid labels such as:

```text
Guaranteed Coverage
Guaranteed Payout
Exact Hospital Cost
Claim Approved
```

unless the application is connected to an authoritative system that can actually establish those facts.

---

# 22. Disclaimer

CoverLens AI is a hackathon prototype.

Information generated by the system is intended for demonstration and informational purposes.

Treatment-cost estimates may be synthetic or based on reference datasets.

Coverage assessments are dependent on the supplied policy and scenario information and do not guarantee claim approval or reimbursement.

Users should verify important decisions against the applicable insurance policy and with the relevant insurer or qualified professional.

---

# 23. Data Governance Principle

The project follows a simple rule:

> **Every important number or claim should have a traceable source—or be explicitly labelled as an estimate or synthetic value.**

This principle is central to CoverLens AI.
