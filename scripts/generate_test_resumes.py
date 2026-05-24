"""
Generate 20 realistic test resume PDFs into D:/AIMarathon/test_resumes/.
Files are numbered 13-32 to avoid colliding with existing edge-case fixtures (1-12).

Run:
    .\.venv\Scripts\python.exe scripts\generate_test_resumes.py
"""

from __future__ import annotations
import os
from dataclasses import dataclass, field
from pathlib import Path
import unicodedata
from fpdf import FPDF
from fpdf.enums import XPos, YPos


def _s(text: str) -> str:
    """Normalize to latin-1-safe ASCII by decomposing accents and mapping common symbols."""
    replacements = {
        "–": "-",   # en dash
        "—": "-",   # em dash
        "’": "'",   # right single quote
        "‘": "'",   # left single quote
        "“": '"',   # left double quote
        "”": '"',   # right double quote
        "→": "->",  # rightwards arrow
        "…": "...", # ellipsis
        "·": "-",   # middle dot
    }
    for src, dst in replacements.items():
        text = text.replace(src, dst)
    # Decompose accented chars and strip combining marks
    normalized = unicodedata.normalize("NFKD", text)
    return "".join(c for c in normalized if ord(c) < 128)

OUT_DIR = Path(__file__).parent.parent / "test_resumes"


# ── Layout helpers ─────────────────────────────────────────────────────────────

def _pdf() -> FPDF:
    pdf = FPDF()
    pdf.set_margins(18, 18, 18)
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()
    return pdf


def _section(pdf: FPDF, title: str):
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(30, 60, 120)
    pdf.cell(0, 6, _s(title.upper()), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    y = pdf.get_y()
    pdf.set_draw_color(30, 60, 120)
    pdf.set_line_width(0.4)
    pdf.line(pdf.l_margin, y, pdf.l_margin + 174, y)
    pdf.set_y(y + 2)
    pdf.set_text_color(0, 0, 0)


def _body(pdf: FPDF, text: str, size: int = 9):
    pdf.set_font("Helvetica", "", size)
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(0, 5, _s(text))
    pdf.ln(1)


def _skills_block(pdf: FPDF, skills: list[str]):
    # Wrap into lines of ≤8 skills to stay well below stuffing CSV run threshold
    pdf.set_font("Helvetica", "", 9)
    chunks = [skills[i:i + 8] for i in range(0, len(skills), 8)]
    for chunk in chunks:
        pdf.set_x(pdf.l_margin)
        pdf.multi_cell(0, 5, _s(",  ".join(chunk)))
    pdf.ln(1)


def render(path: Path, r: "Resume"):
    pdf = _pdf()

    # ── Name ──────────────────────────────────────────────────────────────────
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(20, 20, 20)
    pdf.cell(0, 10, _s(r.name), new_x=XPos.LMARGIN, new_y=YPos.NEXT, align="C")

    # ── Contact line ──────────────────────────────────────────────────────────
    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_text_color(80, 80, 80)
    parts = [r.email, r.phone, r.location]
    if r.linkedin:
        parts.append(r.linkedin)
    if r.github:
        parts.append(r.github)
    pdf.cell(0, 5, _s("  |  ".join(parts)), new_x=XPos.LMARGIN, new_y=YPos.NEXT, align="C")
    pdf.ln(4)
    pdf.set_text_color(0, 0, 0)

    # ── Summary ───────────────────────────────────────────────────────────────
    _section(pdf, "Summary")
    _body(pdf, r.summary)

    # ── Skills ────────────────────────────────────────────────────────────────
    _section(pdf, "Skills")
    _skills_block(pdf, r.skills)

    # ── Experience ────────────────────────────────────────────────────────────
    _section(pdf, "Experience")
    for exp in r.experience:
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_x(pdf.l_margin)
        pdf.cell(0, 5, _s(f"{exp['title']} - {exp['company']}  ({exp['dates']})"), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        for bullet in exp["bullets"]:
            _body(pdf, f"*{bullet}")

    # ── Education ─────────────────────────────────────────────────────────────
    _section(pdf, "Education")
    for edu in r.education:
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_x(pdf.l_margin)
        pdf.cell(0, 5, _s(f"{edu['degree']} - {edu['school']}  ({edu['year']})"), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(1)

    # ── Certifications ────────────────────────────────────────────────────────
    if r.certifications:
        _section(pdf, "Certifications")
        _body(pdf, "  |  ".join(r.certifications))

    # ── Languages ─────────────────────────────────────────────────────────────
    if r.languages:
        _section(pdf, "Languages")
        _body(pdf, "  |  ".join(r.languages))

    pdf.output(str(path))
    print(f"  wrote  {path.name}")


# ── Data model ─────────────────────────────────────────────────────────────────

@dataclass
class Resume:
    name: str
    email: str
    phone: str
    location: str
    linkedin: str
    github: str
    summary: str
    skills: list[str]
    experience: list[dict]
    education: list[dict]
    certifications: list[str] = field(default_factory=list)
    languages: list[str] = field(default_factory=list)


# ── 20 realistic personas ──────────────────────────────────────────────────────

RESUMES: list[tuple[str, Resume]] = [

    ("13_backend_python_senior.pdf", Resume(
        name="Priya Nair",
        email="priya.nair@example.com",
        phone="+1 415 555 0131",
        location="San Francisco, CA",
        linkedin="linkedin.com/in/priyanair",
        github="github.com/priyanair",
        summary=(
            "Senior backend engineer with 8 years of experience building high-throughput "
            "APIs and data pipelines. Deep expertise in Python, FastAPI, PostgreSQL, and "
            "Kafka. Track record of reducing p99 latency by 40% and leading teams of 4-6 engineers."
        ),
        skills=[
            "Python", "FastAPI", "PostgreSQL", "Redis", "Kafka", "Docker",
            "Kubernetes", "AWS", "SQLAlchemy", "pytest", "asyncio", "gRPC",
            "Terraform", "Grafana", "Datadog",
        ],
        experience=[
            {
                "title": "Senior Software Engineer",
                "company": "Stripe",
                "dates": "2020 – present",
                "bullets": [
                    "Redesigned the payment event pipeline using Kafka, reducing processing lag from 8 s to under 200 ms.",
                    "Authored FastAPI microservices handling 50 k req/s with 99.95% uptime over 18 months.",
                    "Mentored three junior engineers through structured code-review sessions and weekly 1:1s.",
                ],
            },
            {
                "title": "Software Engineer",
                "company": "Twilio",
                "dates": "2016 – 2020",
                "bullets": [
                    "Built a rate-limiting service in Python/Redis that cut abuse-related outages by 70%.",
                    "Migrated a monolithic Django app to a suite of FastAPI services, reducing deploy time by half.",
                ],
            },
        ],
        education=[{"degree": "BSc Computer Science", "school": "UC Berkeley", "year": "2016"}],
        certifications=["AWS Certified Solutions Architect – Associate"],
        languages=["English (native)", "Hindi (fluent)"],
    )),

    ("14_backend_go_mid.pdf", Resume(
        name="Marcus Webb",
        email="marcus.webb@example.com",
        phone="+1 206 555 0142",
        location="Seattle, WA",
        linkedin="linkedin.com/in/marcuswebb",
        github="github.com/marcuswebb",
        summary=(
            "Mid-level backend engineer specialising in Go microservices and distributed systems. "
            "Four years of production experience with gRPC, NATS, and CockroachDB. "
            "Comfortable leading technical design discussions and shipping independently."
        ),
        skills=[
            "Go", "gRPC", "NATS", "CockroachDB", "PostgreSQL", "Docker",
            "Kubernetes", "Prometheus", "AWS ECS", "REST APIs", "OpenTelemetry",
        ],
        experience=[
            {
                "title": "Software Engineer",
                "company": "Cockroach Labs",
                "dates": "2022 – present",
                "bullets": [
                    "Developed a distributed job-scheduler in Go, coordinating work across 200+ nodes with sub-second scheduling latency.",
                    "Reduced gRPC connection overhead by implementing connection-pool reuse, saving 15% CPU across the cluster.",
                ],
            },
            {
                "title": "Junior Software Engineer",
                "company": "Convoy",
                "dates": "2020 – 2022",
                "bullets": [
                    "Owned a freight-matching microservice used by 3 000 trucking companies, maintaining 99.9% availability.",
                    "Introduced structured logging with OpenTelemetry, cutting mean-time-to-debug from hours to minutes.",
                ],
            },
        ],
        education=[{"degree": "BSc Software Engineering", "school": "University of Washington", "year": "2020"}],
        certifications=["Certified Kubernetes Application Developer (CKAD)"],
        languages=["English (native)"],
    )),

    ("15_frontend_react_senior.pdf", Resume(
        name="Sofia Delgado",
        email="sofia.delgado@example.com",
        phone="+1 512 555 0153",
        location="Austin, TX",
        linkedin="linkedin.com/in/sofiadelgado",
        github="github.com/sofiadelgado",
        summary=(
            "Senior frontend engineer with 7 years building performant, accessible React "
            "applications. Expert in TypeScript, design-system architecture, and Core Web "
            "Vitals optimisation. Led frontend chapters at two Series-B startups."
        ),
        skills=[
            "React", "TypeScript", "Next.js", "GraphQL", "Tailwind CSS", "Storybook",
            "Playwright", "Vite", "Zustand", "React Query", "Accessibility (WCAG 2.1)",
            "Figma", "Webpack", "Performance profiling",
        ],
        experience=[
            {
                "title": "Senior Frontend Engineer",
                "company": "Linear",
                "dates": "2021 – present",
                "bullets": [
                    "Rebuilt the issue-detail page in React 18 with concurrent features, cutting TTI by 38%.",
                    "Established a Storybook-driven design system adopted by 12 engineers across three product squads.",
                    "Reduced bundle size by 42 kB by tree-shaking an icon library and lazy-loading heavy editor components.",
                ],
            },
            {
                "title": "Frontend Engineer",
                "company": "Notion",
                "dates": "2017 – 2021",
                "bullets": [
                    "Developed the drag-and-drop block editor foundation used by millions of users daily.",
                    "Introduced end-to-end tests with Playwright, reaching 85% coverage of critical user flows.",
                ],
            },
        ],
        education=[{"degree": "BSc Computer Science", "school": "UT Austin", "year": "2017"}],
        languages=["English (native)", "Spanish (conversational)"],
    )),

    ("16_fullstack_node_mid.pdf", Resume(
        name="Daniel Osei",
        email="daniel.osei@example.com",
        phone="+44 20 7946 0164",
        location="London, UK",
        linkedin="linkedin.com/in/danielosei",
        github="github.com/danielosei",
        summary=(
            "Full-stack engineer with five years delivering SaaS products on Node.js and React. "
            "Equally comfortable in a backend API or a React component tree. "
            "Passionate about developer experience, clean APIs, and shipping features users notice."
        ),
        skills=[
            "Node.js", "Express", "React", "TypeScript", "PostgreSQL", "Prisma",
            "Redis", "Docker", "GitHub Actions", "Jest", "REST APIs", "GraphQL",
        ],
        experience=[
            {
                "title": "Full-Stack Engineer",
                "company": "Monzo",
                "dates": "2022 – present",
                "bullets": [
                    "Built a self-serve analytics dashboard with Node/React that replaced 30 hours of manual weekly reporting.",
                    "Designed a Prisma-based multi-tenant data model supporting 200 k business accounts.",
                ],
            },
            {
                "title": "Software Engineer",
                "company": "FreeAgent",
                "dates": "2019 – 2022",
                "bullets": [
                    "Delivered a VAT-filing integration with HMRC's Making Tax Digital API on a hard regulatory deadline.",
                    "Improved CI pipeline reliability by adding retry logic and parallelising test suites, cutting flakiness by 80%.",
                ],
            },
        ],
        education=[{"degree": "BEng Software Engineering", "school": "University of Edinburgh", "year": "2019"}],
        certifications=["AWS Certified Developer – Associate"],
        languages=["English (native)", "Twi (native)"],
    )),

    ("17_mobile_ios_senior.pdf", Resume(
        name="Yuki Tanaka",
        email="yuki.tanaka@example.com",
        phone="+81 3 5555 0175",
        location="Tokyo, Japan",
        linkedin="linkedin.com/in/yukitanaka",
        github="github.com/yukitanaka",
        summary=(
            "Senior iOS engineer with 8 years shipping consumer apps with tens of millions of users. "
            "Expert in Swift, SwiftUI, and Combine. Strong background in performance profiling "
            "and App Store review optimisation."
        ),
        skills=[
            "Swift", "SwiftUI", "UIKit", "Combine", "CoreData", "XCTest",
            "Instruments", "Push Notifications", "WidgetKit", "In-App Purchases",
            "Fastlane", "CI/CD for iOS",
        ],
        experience=[
            {
                "title": "Senior iOS Engineer",
                "company": "LINE Corporation",
                "dates": "2019 – present",
                "bullets": [
                    "Led SwiftUI migration of the messaging home screen, reducing scroll jank by 50% on iPhone 12.",
                    "Designed a CoreData sync layer handling 500 k messages offline with no data loss on reconnect.",
                    "Mentored three mid-level iOS engineers and ran weekly architecture reviews.",
                ],
            },
            {
                "title": "iOS Engineer",
                "company": "Mercari",
                "dates": "2016 – 2019",
                "bullets": [
                    "Shipped a real-time bidding feature in SwiftUI that increased GMV by 12% in Q3 2018.",
                    "Reduced app launch time by 1.2 s by deferring non-critical initialisation to background threads.",
                ],
            },
        ],
        education=[{"degree": "BSc Information Science", "school": "Keio University", "year": "2016"}],
        certifications=["Apple WWDC Scholar (2015)"],
        languages=["Japanese (native)", "English (business)"],
    )),

    ("18_mobile_android_mid.pdf", Resume(
        name="Amara Diallo",
        email="amara.diallo@example.com",
        phone="+33 1 5555 0186",
        location="Paris, France",
        linkedin="linkedin.com/in/amaradiallo",
        github="github.com/amaradiallo",
        summary=(
            "Android engineer with four years of experience building Kotlin-first apps. "
            "Strong advocate for Jetpack Compose and clean architecture. "
            "Contributed to open-source Compose libraries with 2 k GitHub stars."
        ),
        skills=[
            "Kotlin", "Jetpack Compose", "Coroutines", "Room", "Hilt",
            "Retrofit", "Firebase", "JUnit", "Espresso", "Gradle",
            "Android Architecture Components", "Material Design 3",
        ],
        experience=[
            {
                "title": "Android Engineer",
                "company": "Blablacar",
                "dates": "2022 – present",
                "bullets": [
                    "Migrated the booking flow from XML layouts to Jetpack Compose, improving render performance by 30%.",
                    "Built a local-first offline mode using Room and WorkManager, eliminating user complaints about poor connectivity.",
                ],
            },
            {
                "title": "Junior Android Developer",
                "company": "Deezer",
                "dates": "2020 – 2022",
                "bullets": [
                    "Implemented a Hilt-based dependency injection refactor across 40 k lines of legacy code.",
                    "Added deep-link support for 15 in-app destinations, enabling targeted marketing campaigns.",
                ],
            },
        ],
        education=[{"degree": "MSc Mobile Computing", "school": "Université Paris-Saclay", "year": "2020"}],
        languages=["French (native)", "English (fluent)", "Fula (conversational)"],
    )),

    ("19_data_engineer_senior.pdf", Resume(
        name="Rohan Mehta",
        email="rohan.mehta@example.com",
        phone="+1 312 555 0197",
        location="Chicago, IL",
        linkedin="linkedin.com/in/rohanmehta",
        github="github.com/rohanmehta",
        summary=(
            "Senior data engineer with 7 years designing large-scale batch and streaming pipelines. "
            "Deep expertise in Spark, Airflow, dbt, and Snowflake. "
            "Reduced data-warehouse compute costs by 60% at two different companies through query and partition optimisation."
        ),
        skills=[
            "Python", "Apache Spark", "Apache Airflow", "dbt", "Snowflake",
            "BigQuery", "Kafka", "Terraform", "AWS Glue", "Redshift",
            "SQL", "Great Expectations", "Docker", "Looker",
        ],
        experience=[
            {
                "title": "Senior Data Engineer",
                "company": "Grubhub",
                "dates": "2020 – present",
                "bullets": [
                    "Designed a Spark-on-EMR pipeline ingesting 2 billion events/day with SLA-compliant 15-minute latency.",
                    "Introduced dbt transformations that replaced 4 000 lines of stored procedures, cutting model run time by 45%.",
                    "Led a Snowflake cost-reduction initiative saving $400 k/year through clustering key redesign.",
                ],
            },
            {
                "title": "Data Engineer",
                "company": "Morningstar",
                "dates": "2017 – 2020",
                "bullets": [
                    "Built an Airflow-orchestrated financial data pipeline from 50 market data vendors with automated reconciliation.",
                    "Implemented Great Expectations data-quality checks that caught 3 production data incidents before they reached analysts.",
                ],
            },
        ],
        education=[{"degree": "MSc Data Science", "school": "University of Illinois Chicago", "year": "2017"}],
        certifications=["dbt Certified Developer", "Snowflake SnowPro Core"],
        languages=["English (fluent)", "Hindi (native)"],
    )),

    ("20_data_scientist_mid.pdf", Resume(
        name="Clara Fontaine",
        email="clara.fontaine@example.com",
        phone="+1 617 555 0208",
        location="Boston, MA",
        linkedin="linkedin.com/in/clarafontaine",
        github="github.com/clarafontaine",
        summary=(
            "Data scientist with four years turning messy business data into revenue-impacting models. "
            "Skilled in Python, scikit-learn, XGBoost, and running rigorous A/B experiments. "
            "Presented findings to C-suite audiences and influenced product strategy at two companies."
        ),
        skills=[
            "Python", "scikit-learn", "XGBoost", "pandas", "NumPy", "Matplotlib",
            "SQL", "A/B testing", "Bayesian statistics", "MLflow", "Jupyter",
            "Looker", "Spark (basic)", "R",
        ],
        experience=[
            {
                "title": "Data Scientist",
                "company": "Wayfair",
                "dates": "2022 – present",
                "bullets": [
                    "Built an XGBoost churn-prediction model reducing monthly churn by 8% via targeted retention offers.",
                    "Ran 20+ A/B tests end-to-end including power analysis, instrumentation, and executive read-outs.",
                ],
            },
            {
                "title": "Junior Data Scientist",
                "company": "Liberty Mutual",
                "dates": "2020 – 2022",
                "bullets": [
                    "Developed a claims-fraud detection model with 85% precision, saving an estimated $2 M annually.",
                    "Automated weekly reporting with Python scripts, saving 6 analyst-hours per week.",
                ],
            },
        ],
        education=[{"degree": "MSc Statistics", "school": "Boston University", "year": "2020"}],
        certifications=["Google Professional Data Analyst"],
        languages=["English (native)", "French (fluent)"],
    )),

    ("21_ml_engineer_senior.pdf", Resume(
        name="Kevin Park",
        email="kevin.park@example.com",
        phone="+1 650 555 0219",
        location="Palo Alto, CA",
        linkedin="linkedin.com/in/kevinpark",
        github="github.com/kevinpark",
        summary=(
            "Senior ML engineer bridging research and production. Six years delivering PyTorch "
            "models at scale with MLflow, Ray, and Kubernetes. "
            "Specialises in large-language-model fine-tuning, embedding pipelines, and vector search."
        ),
        skills=[
            "Python", "PyTorch", "Hugging Face Transformers", "MLflow", "Ray Train",
            "Kubernetes", "pgvector", "FAISS", "ONNX", "Triton Inference Server",
            "FastAPI", "AWS SageMaker", "W&B", "CUDA (basic)",
        ],
        experience=[
            {
                "title": "Senior ML Engineer",
                "company": "Cohere",
                "dates": "2021 – present",
                "bullets": [
                    "Fine-tuned a 7B-parameter LLM for enterprise search, achieving 15% NDCG improvement over the baseline.",
                    "Built an embedding ingestion pipeline with pgvector handling 50 M documents with sub-100 ms retrieval.",
                    "Reduced model-serving latency by 3x via ONNX export and Triton batching optimisation.",
                ],
            },
            {
                "title": "ML Engineer",
                "company": "Salesforce Research",
                "dates": "2018 – 2021",
                "bullets": [
                    "Productionised a sentiment-analysis model processing 10 M CRM notes per day.",
                    "Introduced Ray-based distributed training that cut epoch time from 6 hours to 40 minutes.",
                ],
            },
        ],
        education=[{"degree": "MSc Machine Learning", "school": "Carnegie Mellon University", "year": "2018"}],
        certifications=["AWS Certified Machine Learning – Specialty"],
        languages=["English (native)", "Korean (conversational)"],
    )),

    ("22_ml_research_phd.pdf", Resume(
        name="Dr. Fatima Al-Hassan",
        email="fatima.alhassan@example.com",
        phone="+1 617 555 0220",
        location="Cambridge, MA",
        linkedin="linkedin.com/in/fatimaalhassan",
        github="github.com/fatimaalhassan",
        summary=(
            "ML researcher with a PhD in NLP and five years of post-doctoral and industry experience. "
            "Published 12 peer-reviewed papers on transformer architectures and alignment. "
            "Seeking to apply cutting-edge research to real-world products at scale."
        ),
        skills=[
            "Python", "PyTorch", "JAX", "Hugging Face Transformers", "RLHF",
            "Prompt engineering", "NLP evaluation benchmarks", "LaTeX",
            "Research design", "Statistical hypothesis testing", "MLflow", "Slurm",
        ],
        experience=[
            {
                "title": "Research Scientist",
                "company": "Allen Institute for AI (AI2)",
                "dates": "2022 – present",
                "bullets": [
                    "Lead researcher on a multilingual reasoning benchmark adopted by 40+ NLP labs worldwide.",
                    "Co-authored RLHF alignment paper accepted at NeurIPS 2023 (citations: 340).",
                ],
            },
            {
                "title": "Research Intern",
                "company": "Google DeepMind",
                "dates": "Summer 2021",
                "bullets": [
                    "Explored chain-of-thought prompting strategies that improved GSM8K accuracy from 57% to 68%.",
                ],
            },
        ],
        education=[
            {"degree": "PhD Natural Language Processing", "school": "MIT CSAIL", "year": "2022"},
            {"degree": "MSc Artificial Intelligence", "school": "University of Oxford", "year": "2017"},
        ],
        certifications=["NeurIPS 2023 Best Paper Honorable Mention"],
        languages=["English (fluent)", "Arabic (native)", "French (conversational)"],
    )),

    ("23_devops_sre_senior.pdf", Resume(
        name="Liam O'Brien",
        email="liam.obrien@example.com",
        phone="+353 1 555 0231",
        location="Dublin, Ireland",
        linkedin="linkedin.com/in/liamobriendevops",
        github="github.com/liamobriendevops",
        summary=(
            "Senior DevOps/SRE with 8 years managing production infrastructure at scale. "
            "Expert in Kubernetes, Terraform, and AWS. "
            "Reduced MTTR by 60% at two companies through better observability and on-call tooling."
        ),
        skills=[
            "Kubernetes", "Terraform", "AWS (EC2, EKS, RDS, S3)", "Helm",
            "ArgoCD", "Prometheus", "Grafana", "ELK Stack", "GitHub Actions",
            "Python", "Bash", "Vault (HashiCorp)", "PagerDuty", "Incident management",
        ],
        experience=[
            {
                "title": "Senior Site Reliability Engineer",
                "company": "Intercom",
                "dates": "2020 – present",
                "bullets": [
                    "Managed 300-node EKS cluster serving 30 k requests/s with 99.99% monthly uptime.",
                    "Designed a GitOps deployment pipeline with ArgoCD cutting release lead time from 2 days to 2 hours.",
                    "Led blameless post-mortems for 15 major incidents, improving runbooks and alert thresholds.",
                ],
            },
            {
                "title": "DevOps Engineer",
                "company": "Paddy Power Betfair",
                "dates": "2016 – 2020",
                "bullets": [
                    "Migrated 200 microservices from bare-metal to Kubernetes over 18 months with zero customer downtime.",
                    "Built Terraform modules for standard AWS infrastructure, reducing new-service setup from 2 weeks to half a day.",
                ],
            },
        ],
        education=[{"degree": "BSc Computer Systems", "school": "Dublin City University", "year": "2016"}],
        certifications=["Certified Kubernetes Administrator (CKA)", "AWS Solutions Architect – Professional"],
        languages=["English (native)", "Irish (basic)"],
    )),

    ("24_cloud_architect_principal.pdf", Resume(
        name="Ingrid Svensson",
        email="ingrid.svensson@example.com",
        phone="+46 8 5555 0242",
        location="Stockholm, Sweden",
        linkedin="linkedin.com/in/ingridsvensson",
        github="github.com/ingridsvensson",
        summary=(
            "Principal cloud architect with 12 years designing multi-region, highly available "
            "platforms on AWS and Azure. Led architecture for fintech platforms processing "
            "$5 B+ in annual transactions. Trusted advisor to CTOs and Engineering VPs."
        ),
        skills=[
            "AWS (20+ services)", "Azure", "Terraform", "Pulumi", "Service mesh (Istio)",
            "Event-driven architecture", "Domain-driven design", "Cost optimisation",
            "Security architecture (Zero Trust)", "Chaos engineering", "FinOps",
            "Architecture review boards", "Stakeholder management",
        ],
        experience=[
            {
                "title": "Principal Cloud Architect",
                "company": "Klarna",
                "dates": "2018 – present",
                "bullets": [
                    "Architected a multi-region active-active payment platform that survived a full EU-WEST-1 AZ failure.",
                    "Drove FinOps programme reducing annual AWS spend by $2.3 M without performance regression.",
                    "Chaired the Architecture Review Board, reviewing 30+ system designs per quarter.",
                ],
            },
            {
                "title": "Senior Cloud Engineer",
                "company": "iZettle (acquired by PayPal)",
                "dates": "2013 – 2018",
                "bullets": [
                    "Built the core payment processing platform from 10 k to 1 M daily transactions.",
                    "Introduced chaos engineering practices via AWS Fault Injection Simulator across 8 teams.",
                ],
            },
        ],
        education=[{"degree": "MSc Computer Science", "school": "KTH Royal Institute of Technology", "year": "2013"}],
        certifications=[
            "AWS Certified Solutions Architect – Professional",
            "AWS Certified Security Specialty",
            "Google Professional Cloud Architect",
        ],
        languages=["Swedish (native)", "English (fluent)", "German (intermediate)"],
    )),

    ("25_security_engineer_mid.pdf", Resume(
        name="Tomás Rivera",
        email="tomas.rivera@example.com",
        phone="+34 93 555 0253",
        location="Barcelona, Spain",
        linkedin="linkedin.com/in/tomasrivera",
        github="github.com/tomasrivera",
        summary=(
            "Application security engineer with five years hardening web services and cloud "
            "infrastructure. Experience in threat modelling, SAST/DAST tooling, and penetration "
            "testing. Passionate about shifting security left in CI/CD pipelines."
        ),
        skills=[
            "OWASP Top 10", "Threat modelling (STRIDE)", "Burp Suite", "SAST (Semgrep, SonarQube)",
            "DAST (OWASP ZAP)", "AWS IAM", "Secrets management (Vault)", "Python",
            "Bash", "Container security (Trivy, Falco)", "Incident response", "Bug bounty",
        ],
        experience=[
            {
                "title": "Application Security Engineer",
                "company": "Glovo",
                "dates": "2022 – present",
                "bullets": [
                    "Embedded Semgrep SAST into CI pipelines across 60 repositories, catching 200+ vulns before merge.",
                    "Led threat modelling workshops for 5 product squads, resulting in 35 actionable security improvements.",
                ],
            },
            {
                "title": "Security Analyst",
                "company": "PwC Spain",
                "dates": "2019 – 2022",
                "bullets": [
                    "Conducted 30+ penetration tests for financial and healthcare clients, delivering CVSS-scored reports.",
                    "Discovered a critical SQL injection in a FTSE 250 client's login page during a black-box engagement.",
                ],
            },
        ],
        education=[{"degree": "MSc Cybersecurity", "school": "Universitat Politecnica de Catalunya", "year": "2019"}],
        certifications=["OSCP", "CEH"],
        languages=["Spanish (native)", "English (fluent)", "Catalan (native)"],
    )),

    ("26_qa_automation_mid.pdf", Resume(
        name="Naomi Kato",
        email="naomi.kato@example.com",
        phone="+81 6 5555 0264",
        location="Osaka, Japan",
        linkedin="linkedin.com/in/naomikato",
        github="github.com/naomikato",
        summary=(
            "QA automation engineer with five years building maintainable test frameworks for "
            "web and API layers. Expert in Playwright and Cypress. "
            "Reduced release-blocking regressions by 80% through shift-left testing practices."
        ),
        skills=[
            "Playwright", "Cypress", "Selenium", "Jest", "pytest", "REST Assured",
            "TypeScript", "Python", "CI/CD (GitHub Actions)", "Test planning",
            "Performance testing (k6)", "Accessibility testing (axe-core)", "BDD (Cucumber)",
        ],
        experience=[
            {
                "title": "QA Automation Engineer",
                "company": "Rakuten",
                "dates": "2021 – present",
                "bullets": [
                    "Built a Playwright test suite with 500 end-to-end scenarios, integrated into every PR via GitHub Actions.",
                    "Introduced k6 performance tests that surfaced a 3x regression in checkout latency before a Black Friday release.",
                ],
            },
            {
                "title": "QA Engineer",
                "company": "CyberAgent",
                "dates": "2019 – 2021",
                "bullets": [
                    "Automated 70% of a previously manual regression checklist, freeing 2 QA FTEs for exploratory testing.",
                    "Implemented axe-core accessibility checks across 20 pages, achieving WCAG AA compliance.",
                ],
            },
        ],
        education=[{"degree": "BSc Information Technology", "school": "Osaka University", "year": "2019"}],
        certifications=["ISTQB Certified Tester Foundation Level"],
        languages=["Japanese (native)", "English (business)"],
    )),

    ("27_embedded_engineer_senior.pdf", Resume(
        name="Henrik Braun",
        email="henrik.braun@example.com",
        phone="+49 89 5555 0275",
        location="Munich, Germany",
        linkedin="linkedin.com/in/henrikbraun",
        github="github.com/henrikbraun",
        summary=(
            "Senior embedded systems engineer with 10 years writing safety-critical firmware for "
            "automotive and industrial IoT devices. Expert in C/C++, RTOS (FreeRTOS, Zephyr), "
            "and ARM Cortex-M. Functional Safety (ISO 26262) certified practitioner."
        ),
        skills=[
            "C", "C++", "FreeRTOS", "Zephyr RTOS", "ARM Cortex-M", "CAN bus",
            "UART", "SPI", "I2C", "CMake", "GDB/JTAG", "Unit testing (Unity, CppUTest)",
            "ISO 26262", "MISRA C", "Python (host tooling)",
        ],
        experience=[
            {
                "title": "Senior Embedded Engineer",
                "company": "Continental AG",
                "dates": "2018 – present",
                "bullets": [
                    "Developed ASIL-B firmware for an ADAS sensor fusion module deployed in 200 k vehicles.",
                    "Led migration of bootloader from bare-metal to Zephyr RTOS, reducing boot time by 40%.",
                    "Designed CAN-FD communication stack compliant with ISO 26262 and reviewed by TÜV.",
                ],
            },
            {
                "title": "Embedded Software Engineer",
                "company": "Siemens Industrial IoT",
                "dates": "2014 – 2018",
                "bullets": [
                    "Programmed FreeRTOS-based data-logger for industrial PLCs, sampling 16 channels at 10 kHz.",
                    "Reduced flash footprint by 30% via compiler optimisation flags and link-time dead-code elimination.",
                ],
            },
        ],
        education=[{"degree": "MEng Electrical & Computer Engineering", "school": "TU Munich", "year": "2014"}],
        certifications=["Functional Safety Engineer (TÜV Rheinland)"],
        languages=["German (native)", "English (fluent)"],
    )),

    ("28_game_developer_mid.pdf", Resume(
        name="Jordan Lee",
        email="jordan.lee@example.com",
        phone="+1 213 555 0286",
        location="Los Angeles, CA",
        linkedin="linkedin.com/in/jordanleedev",
        github="github.com/jordanleedev",
        summary=(
            "Mid-level game developer with four years shipping mobile and PC titles using Unity. "
            "Strong in gameplay systems, shader programming, and multiplayer netcode. "
            "Shipped three games with aggregate 5 M downloads on iOS and Android."
        ),
        skills=[
            "Unity", "C#", "HLSL (shader programming)", "Photon Fusion (netcode)",
            "Addressables", "DOTS (basic)", "Game design patterns", "Git",
            "PlayFab (live-ops)", "UI Toolkit", "Physics (Unity Physics)",
        ],
        experience=[
            {
                "title": "Game Developer",
                "company": "Jam City",
                "dates": "2022 – present",
                "bullets": [
                    "Led gameplay programming for a match-3 mobile game that reached #8 on the US App Store charts.",
                    "Implemented a server-authoritative Photon Fusion multiplayer mode for a co-op puzzle game.",
                ],
            },
            {
                "title": "Junior Unity Developer",
                "company": "Scopely",
                "dates": "2020 – 2022",
                "bullets": [
                    "Built procedural level generation system producing 10 000 unique dungeon layouts.",
                    "Optimised draw calls from 800 to 120 per frame, enabling smooth 60 fps on mid-range Android.",
                ],
            },
        ],
        education=[{"degree": "BSc Computer Science (Games)", "school": "USC Viterbi School of Engineering", "year": "2020"}],
        languages=["English (native)", "Mandarin (conversational)"],
    )),

    ("29_product_manager_senior.pdf", Resume(
        name="Aisha Kamara",
        email="aisha.kamara@example.com",
        phone="+1 347 555 0297",
        location="New York, NY",
        linkedin="linkedin.com/in/aishakamara",
        github="",
        summary=(
            "Senior product manager with 7 years driving B2B SaaS products from 0→1 and 1→scale. "
            "Shipped products used by 500+ enterprise customers across fintech and HR tech. "
            "Data-informed decision maker with strong stakeholder communication skills."
        ),
        skills=[
            "Product strategy", "OKR frameworks", "Roadmapping", "User research",
            "SQL (data queries)", "A/B testing", "Figma (wireframing)", "Jira",
            "Go-to-market planning", "Pricing & packaging", "Enterprise sales partnership",
            "Technical writing", "Stakeholder management",
        ],
        experience=[
            {
                "title": "Senior Product Manager",
                "company": "Rippling",
                "dates": "2021 – present",
                "bullets": [
                    "Owned the payroll-integrations product area, growing API partner revenue by 35% YoY.",
                    "Defined and shipped an employer-of-record feature used by 120 global enterprise accounts in launch quarter.",
                    "Ran 12 discovery interviews per quarter and synthesised insights into quarterly product bets.",
                ],
            },
            {
                "title": "Product Manager",
                "company": "Plaid",
                "dates": "2017 – 2021",
                "bullets": [
                    "Launched Plaid's first mobile-SDK for account linking, adopted by 30 fintech partners in 6 months.",
                    "Reduced developer time-to-first-call by 40% by redesigning the API quickstart flow.",
                ],
            },
        ],
        education=[{"degree": "MBA", "school": "Columbia Business School", "year": "2017"},
                   {"degree": "BSc Economics", "school": "Howard University", "year": "2015"}],
        certifications=["Pragmatic Marketing Certified (PMC-III)"],
        languages=["English (native)", "Krio (conversational)"],
    )),

    ("30_designer_ux_mid.pdf", Resume(
        name="Chiara Rossi",
        email="chiara.rossi@example.com",
        phone="+39 02 5555 0308",
        location="Milan, Italy",
        linkedin="linkedin.com/in/chiararossi",
        github="",
        summary=(
            "UX/product designer with five years crafting intuitive interfaces for enterprise and "
            "consumer SaaS. Expert in Figma and design-system methodology. "
            "Deep background in accessibility standards and data-driven design validation."
        ),
        skills=[
            "Figma", "Design systems", "User research", "Usability testing", "Wireframing",
            "Prototyping", "Information architecture", "WCAG 2.1 AA", "Hotjar",
            "A/B testing (Optimizely)", "HTML/CSS (implementation handoff)", "Miro",
        ],
        experience=[
            {
                "title": "Product Designer",
                "company": "Contentful",
                "dates": "2022 – present",
                "bullets": [
                    "Redesigned the content-modelling interface, reducing time-on-task in usability tests by 35%.",
                    "Contributed 60+ components to the company's design system, adopted across 4 product lines.",
                ],
            },
            {
                "title": "UX Designer",
                "company": "Sketchfab",
                "dates": "2019 – 2022",
                "bullets": [
                    "Led end-to-end design for a new 3D-model annotation tool shipped to 200 k creators.",
                    "Established user-research cadence of biweekly interviews, informing 8 quarterly roadmap decisions.",
                ],
            },
        ],
        education=[{"degree": "MA Interaction Design", "school": "Politecnico di Milano", "year": "2019"}],
        certifications=["Nielsen Norman Group UX Certification"],
        languages=["Italian (native)", "English (fluent)", "Spanish (intermediate)"],
    )),

    ("31_technical_writer_mid.pdf", Resume(
        name="Elliot Marsh",
        email="elliot.marsh@example.com",
        phone="+1 503 555 0319",
        location="Portland, OR",
        linkedin="linkedin.com/in/elliotmarsh",
        github="github.com/elliotmarsh",
        summary=(
            "Senior technical writer with six years creating developer documentation for "
            "APIs, SDKs, and cloud platforms. Doubled self-serve support adoption by 45% "
            "at two companies through structured docs-as-code workflows and clear tutorials."
        ),
        skills=[
            "API documentation", "OpenAPI (Swagger)", "Markdown", "Docs-as-code (MkDocs, Docusaurus)",
            "Git", "Python (code samples)", "Information architecture", "Developer experience",
            "User research", "SEO for docs", "Confluence", "DITA (basic)",
        ],
        experience=[
            {
                "title": "Senior Technical Writer",
                "company": "Twilio",
                "dates": "2021 – present",
                "bullets": [
                    "Rewrote the Voice SDK quickstart, reducing time-to-first-call for new developers from 45 to 12 minutes.",
                    "Built a docs-as-code pipeline with MkDocs and GitHub Actions, enabling 50+ engineers to contribute docs via PRs.",
                ],
            },
            {
                "title": "Technical Writer",
                "company": "HashiCorp",
                "dates": "2018 – 2021",
                "bullets": [
                    "Authored Vault's secrets-engine integration guides covering 15 cloud providers.",
                    "Launched a community feedback programme collecting 800 docs improvement suggestions per quarter.",
                ],
            },
        ],
        education=[{"degree": "BA English & Computer Science", "school": "Reed College", "year": "2018"}],
        certifications=["Google Technical Writing Certification"],
        languages=["English (native)"],
    )),

    ("32_junior_grad_new.pdf", Resume(
        name="Mei-Ling Chen",
        email="mei.chen@example.com",
        phone="+1 408 555 0320",
        location="San Jose, CA",
        linkedin="linkedin.com/in/meilingchen",
        github="github.com/meilingchen",
        summary=(
            "Recent BSc Computer Science graduate eager to contribute to a collaborative "
            "engineering team. Completed two software internships and built three full-stack "
            "side projects. Quick learner, detail-oriented, and passionate about clean code."
        ),
        skills=[
            "Python", "JavaScript", "React", "Node.js", "Java", "SQL",
            "Git", "Docker (basic)", "REST APIs", "pytest", "JUnit",
        ],
        experience=[
            {
                "title": "Software Engineering Intern",
                "company": "Cisco Systems",
                "dates": "Summer 2024",
                "bullets": [
                    "Built a React dashboard for network telemetry data viewed by 200 network operations engineers.",
                    "Fixed 14 production bugs in a Java backend service and wrote unit tests to prevent regressions.",
                ],
            },
            {
                "title": "Software Engineering Intern",
                "company": "SAP Labs",
                "dates": "Summer 2023",
                "bullets": [
                    "Contributed three features to an internal developer-tooling Python CLI used across 50 teams.",
                    "Presented a performance analysis of REST vs GraphQL to a team of 20 engineers.",
                ],
            },
        ],
        education=[{"degree": "BSc Computer Science", "school": "San Jose State University", "year": "2025"}],
        languages=["English (fluent)", "Mandarin (native)"],
    )),
]


# ── Runner ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Writing {len(RESUMES)} resumes to {OUT_DIR} …")
    for filename, resume in RESUMES:
        render(OUT_DIR / filename, resume)
    print("Done.")
