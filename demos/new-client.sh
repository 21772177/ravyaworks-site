#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRAMEWORK="$SCRIPT_DIR/_framework"
RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; NC='\033[0m'

usage() {
  echo "Usage: $0 \"Client Name\" <industry>"
  echo ""
  echo "Industries: restaurant, school, hospital, gym, salon, grocery, boutique, caterer, coaching, realestate, pharmacy, lawfirm, petshop"
  echo ""
  echo "Examples:"
  echo "  $0 \"GreenLeaf Restaurant\" restaurant"
  echo "  $0 \"Sunrise Hospital\" hospital"
  exit 1
}

NAME="${1:-}"
INDUSTRY="${2:-}"
[ -z "$NAME" ] && usage
[ -z "$INDUSTRY" ] && usage

FOLDER="$(echo "$NAME" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g; s/^-//; s/-$//')"
DIR="$SCRIPT_DIR/$FOLDER"

if [ -d "$DIR" ]; then
  echo -e "${RED}Error: '$FOLDER' already exists${NC}"
  exit 1
fi

# ---- Industry presets ----
case "$INDUSTRY" in
  restaurant)
    PRESET="restaurant"
    PRIMARY="#c0392b"; PRIMARY_DARK="#962d22"; PRIMARY_LIGHT="#e74c3c"
    SECONDARY="#2c3e50"; ACCENT="#f39c12"; SURFACE="#fff5f2"
    HERO_HEADING="Authentic Flavours at <span class='accent'>$NAME</span>"
    SERVICES_STYLE="menu"; GALLERY_STYLE="grid"; HAS_TEAM="no"; HAS_BLOG="no"
    UIMAGE="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80"
    DESC="fine dining, Indian cuisine, family restaurant"
    TAGLINE="Delicious Food, Warm Hospitality"
    ;;
  school)
    PRESET="school"
    PRIMARY="#2563eb"; PRIMARY_DARK="#1d4ed8"; PRIMARY_LIGHT="#3b82f6"
    SECONDARY="#1e3a5f"; ACCENT="#f59e0b"; SURFACE="#eff6ff"
    HERO_HEADING="Shaping Young Minds at <span class='accent'>$NAME</span>"
    SERVICES_STYLE="cards"; GALLERY_STYLE="grid"; HAS_TEAM="no"; HAS_BLOG="yes"
    UIMAGE="https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1600&q=80"
    DESC="CBSE school, education, kindergarten"
    TAGLINE="Nurturing Excellence"
    ;;
  hospital)
    PRESET="hospital"
    PRIMARY="#0d9488"; PRIMARY_DARK="#0f766e"; PRIMARY_LIGHT="#14b8a6"
    SECONDARY="#134e4a"; ACCENT="#0ea5e9"; SURFACE="#f0fdfa"
    HERO_HEADING="Compassionate Care at <span class='accent'>$NAME</span>"
    SERVICES_STYLE="cards"; GALLERY_STYLE="grid"; HAS_TEAM="yes"; HAS_BLOG="no"
    UIMAGE="https://images.unsplash.com/photo-1551076805-e1869033e561?w=1600&q=80"
    DESC="multi-speciality hospital, healthcare"
    TAGLINE="Caring for Life"
    ;;
  gym|fitness)
    PRESET="gym"
    PRIMARY="#16a34a"; PRIMARY_DARK="#15803d"; PRIMARY_LIGHT="#22c55e"
    SECONDARY="#111827"; ACCENT="#facc15"; SURFACE="#f0fdf4"
    HERO_HEADING="Push Your Limits at <span class='accent'>$NAME</span>"
    SERVICES_STYLE="pricing"; GALLERY_STYLE="scroll"; HAS_TEAM="yes"; HAS_BLOG="no"
    DARKMODE="true"
    UIMAGE="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1600&q=80"
    DESC="gym, fitness center, personal training"
    TAGLINE="Stronger Every Day"
    ;;
  salon|beauty)
    PRESET="salon"
    PRIMARY="#be185d"; PRIMARY_DARK="#9d174d"; PRIMARY_LIGHT="#ec4899"
    SECONDARY="#4a1a2c"; ACCENT="#d4af7a"; SURFACE="#fdf2f8"
    HERO_HEADING="Where Beauty Meets <span class='accent'>Elegance</span>"
    SERVICES_STYLE="cards"; GALLERY_STYLE="masonry"; HAS_TEAM="yes"; HAS_BLOG="no"
    UIMAGE="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1600&q=80"
    DESC="unisex salon, beauty studio, hair styling"
    TAGLINE="Where Beauty Meets Elegance"
    ;;
  grocery|supermarket)
    PRESET="grocery"
    PRIMARY="#65a30d"; PRIMARY_DARK="#4d7c0f"; PRIMARY_LIGHT="#84cc16"
    SECONDARY="#1a2e05"; ACCENT="#f97316"; SURFACE="#f7fee7"
    HERO_HEADING="Farm Fresh, <span class='accent'>Delivered Daily</span>"
    SERVICES_STYLE="cards"; GALLERY_STYLE="grid"; HAS_TEAM="no"; HAS_BLOG="no"
    UIMAGE="https://images.unsplash.com/photo-1542838132-92c53300491e?w=1600&q=80"
    DESC="grocery store, supermarket, fresh produce"
    TAGLINE="Farm Fresh, Delivered Daily"
    ;;
  boutique|fashion)
    PRESET="boutique"
    PRIMARY="#7c3aed"; PRIMARY_DARK="#6d28d9"; PRIMARY_LIGHT="#8b5cf6"
    SECONDARY="#2e1065"; ACCENT="#d4af37"; SURFACE="#faf5ff"
    HERO_HEADING="Timeless Style at <span class='accent'>$NAME</span>"
    SERVICES_STYLE="cards"; GALLERY_STYLE="masonry"; HAS_TEAM="no"; HAS_BLOG="no"
    UIMAGE="https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?w=1600&q=80"
    DESC="ethnic fashion boutique, designer wear"
    TAGLINE="Crafted for You"
    ;;
  caterer|catering)
    PRESET="caterer"
    PRIMARY="#9f1239"; PRIMARY_DARK="#881337"; PRIMARY_LIGHT="#be123c"
    SECONDARY="#1c1917"; ACCENT="#d4af37"; SURFACE="#fff1f2"
    HERO_HEADING="Exquisite Catering for <span class='accent'>Every Celebration</span>"
    SERVICES_STYLE="cards"; GALLERY_STYLE="grid"; HAS_TEAM="no"; HAS_BLOG="no"
    UIMAGE="https://images.unsplash.com/photo-1555244162-803834f70033?w=1600&q=80"
    DESC="event catering, wedding catering"
    TAGLINE="Making Every Event Memorable"
    ;;
  coaching|tutoring)
    PRESET="coaching"
    PRIMARY="#4f46e5"; PRIMARY_DARK="#4338ca"; PRIMARY_LIGHT="#6366f1"
    SECONDARY="#1e1b4b"; ACCENT="#f59e0b"; SURFACE="#eef2ff"
    HERO_HEADING="Crack Every Exam with <span class='accent'>$NAME</span>"
    SERVICES_STYLE="cards"; GALLERY_STYLE="grid"; HAS_TEAM="yes"; HAS_BLOG="no"
    UIMAGE="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1600&q=80"
    DESC="coaching institute, JEE, NEET, CET"
    TAGLINE="Turning Ambition into Achievement"
    ;;
  realestate|property)
    PRESET="realestate"
    PRIMARY="#2563eb"; PRIMARY_DARK="#1d4ed8"; PRIMARY_LIGHT="#3b82f6"
    SECONDARY="#0f172a"; ACCENT="#f59e0b"; SURFACE="#f0f9ff"
    HERO_HEADING="Find Your Dream Home with <span class='accent'>$NAME</span>"
    SERVICES_STYLE="cards"; GALLERY_STYLE="grid"; HAS_TEAM="yes"; HAS_BLOG="yes"
    UIMAGE="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1600&q=80"
    DESC="real estate, property, homes"
    TAGLINE="Your Dream Home Awaits"
    ;;
  pharmacy|medical)
    PRESET="pharmacy"
    PRIMARY="#0891b2"; PRIMARY_DARK="#0e7490"; PRIMARY_LIGHT="#06b6d4"
    SECONDARY="#164e63"; ACCENT="#10b981"; SURFACE="#ecfeff"
    HERO_HEADING="Trusted Care at <span class='accent'>$NAME</span>"
    SERVICES_STYLE="cards"; GALLERY_STYLE="grid"; HAS_TEAM="yes"; HAS_BLOG="no"
    UIMAGE="https://images.unsplash.com/photo-1576671081837-49000212a370?w=1600&q=80"
    DESC="pharmacy, medical store, healthcare"
    TAGLINE="Your Health, Our Priority"
    ;;
  lawfirm|legal)
    PRESET="lawfirm"
    PRIMARY="#1e293b"; PRIMARY_DARK="#0f172a"; PRIMARY_LIGHT="#334155"
    SECONDARY="#0f172a"; ACCENT="#d4af37"; SURFACE="#f8fafc"
    HERO_HEADING="Justice & Trust at <span class='accent'>$NAME</span>"
    SERVICES_STYLE="cards"; GALLERY_STYLE="grid"; HAS_TEAM="yes"; HAS_BLOG="yes"
    UIMAGE="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1600&q=80"
    DESC="law firm, legal services, attorney"
    TAGLINE="Justice Delivered with Integrity"
    ;;
  petshop|pet)
    PRESET="petshop"
    PRIMARY="#e11d48"; PRIMARY_DARK="#be123c"; PRIMARY_LIGHT="#fb7185"
    SECONDARY="#1c1917"; ACCENT="#fbbf24"; SURFACE="#fff1f2"
    HERO_HEADING="Pamper Your Pet at <span class='accent'>$NAME</span>"
    SERVICES_STYLE="cards"; GALLERY_STYLE="grid"; HAS_TEAM="no"; HAS_BLOG="no"
    UIMAGE="https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=1600&q=80"
    DESC="pet shop, pet supplies, grooming"
    TAGLINE="Everything Your Pet Needs"
    ;;
  *)
    echo -e "${RED}Unknown industry: $INDUSTRY${NC}"
    echo "Supported: restaurant, school, hospital, gym, salon, grocery, boutique, caterer, coaching, realestate, pharmacy, lawfirm, petshop"
    exit 1
    ;;
esac

echo -e "${CYAN}Creating new client site...${NC}"
echo "  Name:     $NAME"
echo "  Industry: $INDUSTRY"
echo "  Folder:   $FOLDER"
echo ""

# Create directory structure
mkdir -p "$DIR/assets"
echo -e "${GREEN}✓${NC} Created $DIR/"

# Generate index.html (copy restaurant template, update preset)
cp "$SCRIPT_DIR/restaurant/index.html" "$DIR/index.html"
sed -i "s/data-preset=\"[^\"]*\"/data-preset=\"$PRESET\"/" "$DIR/index.html"
sed -i "s|<!-- 1. Site config.*|<!-- 1. Site config (content + theme) -->|" "$DIR/index.html"
echo -e "${GREEN}✓${NC} Generated index.html (preset: $PRESET)"

# Generate config.js
CATEGORIES=""
SERVICES_ITEMS=""
TEAM_SECTION=""
BLOG_SECTION=""

case "$INDUSTRY" in
  restaurant)
    CATEGORIES='navLabels: { services: "Menu" },'
    SERVICES_ITEMS='[
      { title: "Signature Starter", price: "₹280", tag: "Chef Special", description: "A delightful starter crafted with fresh ingredients and traditional spices.", image: "assets/placeholder.jpg" },
      { title: "Main Course Delight", price: "₹340", tag: "Bestseller", description: "Rich and aromatic main course made with hand-picked spices.", image: "assets/placeholder.jpg" },
      { title: "Special Biryani", price: "₹260", tag: "Signature", description: "Fragrant basmati layered with spiced ingredients, dum-cooked to perfection.", image: "assets/placeholder.jpg" },
      { title: "Creamy Dessert", price: "₹140", tag: "Dessert", description: "A perfect sweet ending to your meal.", image: "assets/placeholder.jpg" }
    ]'
    ;;
  gym|fitness)
    SERVICES_ITEMS='[
      { title: "Basic Plan", price: "₹1,499/mo", tag: "Starter", description: "Full gym access during standard hours. Includes cardio and weight training zones.", features: ["Gym Access 6am-10pm", "Cardio Zone", "Weight Training", "Locker Room"] },
      { title: "Pro Plan", price: "₹2,499/mo", tag: "Popular", description: "Unlimited gym access plus group classes and one PT session per week.", features: ["24/7 Access", "50+ Group Classes", "1 PT Session/Week", "Steam & Sauna"] },
      { title: "Elite Plan", price: "₹3,999/mo", tag: "Best Value", description: "Everything in Pro plus unlimited PT, nutrition counseling, and recovery zone.", features: ["Unlimited PT", "Nutrition Plan", "Recovery Zone", "Guest Passes"] }
    ]'
    ;;
  *)
    SERVICES_ITEMS='[
      { title: "Service One", tag: "Featured", description: "High-quality service delivered by experienced professionals.", image: "assets/placeholder.jpg" },
      { title: "Service Two", tag: "Popular", description: "Comprehensive solutions tailored to your needs.", image: "assets/placeholder.jpg" },
      { title: "Service Three", tag: "Premium", description: "Premium experience with personalized attention.", image: "assets/placeholder.jpg" }
    ]'
    ;;
esac

if [ "$HAS_TEAM" = "yes" ]; then
  TEAM_SECTION='team: [
    { name: "Lead Professional", role: "Senior Expert", specialty: "15+ years experience", description: "Dedicated to delivering exceptional results for every client." },
    { name: "Senior Specialist", role: "Department Head", specialty: "10+ years experience", description: "Passionate about quality and customer satisfaction." },
    { name: "Junior Associate", role: "Support Specialist", specialty: "5+ years experience", description: "Committed to helping you achieve your goals." }
  ],'
fi

if [ "$HAS_BLOG" = "yes" ]; then
  BLOG_SECTION='blog: [
    { title: "Welcome to '"$NAME"'", date: "January 2026", category: "News", excerpt: "We are excited to announce the opening of our new location serving the community.", image: "assets/placeholder.jpg", link: "#" },
    { title: "Top Tips from Our Experts", date: "February 2026", category: "Tips", excerpt: "Our team shares valuable insights to help you make the most of our services.", image: "assets/placeholder.jpg", link: "#" }
  ],'
fi

cat > "$DIR/config.js" << CONFIGEOF
window.SITE_CONFIG = {

  business: {
    name: "$NAME",
    tagline: "$TAGLINE",
    industry: "$INDUSTRY",
    established: "2026"
  },

  theme: {
    primary: "$PRIMARY",
    primaryDark: "$PRIMARY_DARK",
    primaryLight: "$PRIMARY_LIGHT",
    secondary: "$SECONDARY",
    accent: "$ACCENT",
    surfaceAlt: "$SURFACE",
    headingFont: "'Poppins', sans-serif",
    bodyFont: "'Inter', sans-serif"
  },

  seo: {
    description: "${NAME} is a trusted $DESC. Quality service and customer satisfaction guaranteed.",
    keywords: "${INDUSTRY}, ${NAME}, Bangalore, India",
    ogImage: "assets/hero.jpg"
  },

  $CATEGORIES
  cta: {
    header: "Get Started",
    primary: "Contact Us",
    secondary: "WhatsApp"
  },

  hero: {
    heading: "$HERO_HEADING",
    subheading: "Welcome to ${NAME} — where quality meets care. We are dedicated to providing exceptional service that exceeds your expectations every single time.",
    images: ["assets/hero.jpg"],
    quick: [
      "Trusted by Hundreds",
      "Expert Professionals",
      "Quality Guaranteed",
      "Customer First Approach"
    ]
  },

  about: {
    title: "Welcome to $NAME",
    image: "assets/placeholder.jpg",
    since: "1",
    paragraphs: [
      "Welcome to $NAME. We are a passionate team dedicated to delivering outstanding service to our valued customers. Our journey began with a simple mission — to provide the highest quality experience in a warm, professional environment.",
      "Our team brings years of expertise and genuine care to everything we do. We believe in building lasting relationships through trust, transparency, and exceptional service.",
      "Your satisfaction is our greatest reward."
    ],
    mission: "To deliver exceptional quality and service that exceeds expectations, building lasting relationships with every client we serve.",
    vision: "To be the most trusted and respected name in our industry, known for uncompromising quality and genuine care.",
    footerBlurb: "Trusted $INDUSTRY serving Bangalore with quality, care and professionalism.",
    stats: [
      { value: "500+", label: "Happy Clients" },
      { value: "50+", label: "Services Offered" },
      { value: "4.8★", label: "Average Rating" },
      { value: "100%", label: "Satisfaction" }
    ]
  },

  services: {
    style: "$SERVICES_STYLE",
    eyebrow: "Our Services",
    title: "What We Offer",
    subtitle: "Comprehensive services designed to meet your needs with quality, care and professionalism.",
    items: $SERVICES_ITEMS
  },

  gallery: [
    "assets/placeholder.jpg",
    "assets/placeholder.jpg",
    "assets/placeholder.jpg"
  ],

  testimonials: [
    { name: "Happy Client", role: "Regular Customer", rating: 5, text: "Absolutely wonderful experience! The team went above and beyond to make sure everything was perfect. Highly recommended.", avatar: "" },
    { name: "Satisfied Customer", role: "Verified Client", rating: 5, text: "I have been coming here for months and the quality has been consistently outstanding. Truly the best in town.", avatar: "" },
    { name: "First-Time Visitor", role: "New Client", rating: 5, text: "From the warm welcome to the excellent service — every moment was perfect. I will definitely be coming back.", avatar: "" }
  ],

  ctaBand: {
    title: "Ready to Experience the Best?",
    subtitle: "Contact us today and let us show you why our customers keep coming back."
  },

  $TEAM_SECTION
  $BLOG_SECTION
  faq: [
    { q: "What services do you offer?", a: "We offer a comprehensive range of services tailored to meet your needs. Contact us for a full list and personalized recommendations." },
    { q: "How can I contact you?", a: "You can reach us by phone, WhatsApp, email, or by filling out the contact form on this page. We typically respond within 2-4 hours." },
    { q: "What are your hours?", a: "Our standard hours are Monday through Saturday, 10:00 AM to 8:00 PM. Sunday hours may vary — please check with us." },
    { q: "Do you accept online payments?", a: "Yes, we accept all major UPI apps, credit/debit cards and net banking. Cash is also accepted." },
    { q: "Is parking available?", a: "Yes, parking is available near our premises. Please contact us for specific instructions." }
  ],

  contact: {
    phone: "+91 84729 71200",
    whatsapp: "+91 84729 71200",
    email: "hello@${FOLDER}.example.com",
    address: {
      full: "Bangalore, Karnataka, India",
      area: "Bangalore",
      city: "Bengaluru",
      pincode: "560001"
    },
    mapEmbed: "https://www.google.com/maps?q=Bangalore&output=embed"
  },

  hours: [
    { day: "Monday – Saturday", time: "10:00 AM – 8:00 PM" },
    { day: "Sunday", time: "By Appointment" }
  ],

  social: {
    facebook: "#",
    instagram: "#",
    twitter: "#",
    youtube: "#"
  }
};
CONFIGEOF

echo -e "${GREEN}✓${NC} Generated config.js"

# Download hero image from Unsplash
echo -e "${YELLOW}   Downloading hero image...${NC}"
curl -sL -o "$DIR/assets/hero.jpg" "$UIMAGE" 2>/dev/null && echo -e "${GREEN}✓${NC} Downloaded hero image" || echo -e "${YELLOW}⚠  Hero image download failed — add one manually${NC}"

# Generate placeholder images (simple colored background)
for img in about.jpg gallery-1.jpg gallery-2.jpg gallery-3.jpg; do
  if [ ! -f "$DIR/assets/$img" ]; then
    # Create a tiny placeholder (1x1 transparent pixel via base64)
    echo -n "" > "$DIR/assets/$img"
    cp "$DIR/assets/hero.jpg" "$DIR/assets/$img" 2>/dev/null || true
  fi
done
echo -e "${GREEN}✓${NC} Assets directory ready"

# Summary
echo ""
echo -e "${CYAN}════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Client site created successfully!${NC}"
echo -e "${CYAN}════════════════════════════════════════════${NC}"
echo ""
echo "  Folder: $DIR"
echo "  View:   Open $FOLDER/index.html in browser"
echo "  Edit:   $FOLDER/config.js to customize content"
echo "  Images: Replace assets/*.jpg with real photos"
echo "  Deploy: ./deploy.sh $FOLDER"
echo ""
