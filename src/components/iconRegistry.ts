import {
  Apple, Award, Baby, BadgePercent, Banknote, Beef, Bike, BookOpen, Briefcase, Building2, Bus, Camera, Car, Cat,
  ChartLine, CircleHelp, Clapperboard, Coffee, Coins, Cookie, CreditCard, Croissant, CupSoda, Dog, Droplet,
  Dumbbell, Ellipsis, Flame, Footprints, Fuel, Gamepad2, Gem, Gift, Glasses, Globe, GraduationCap, HandCoins,
  HandHeart, Headphones, HeartHandshake, HeartPulse, House, IceCreamCone, KeyRound, Lamp, Landmark, Laptop,
  Motorbike, Mountain, Music, Package, Palette, PartyPopper, Pencil, PiggyBank, Pill, Pizza, Plane, Plug,
  Receipt, Sandwich, School, Scissors, Shirt, ShoppingBag, ShoppingBasket, ShoppingCart, Smartphone, Sofa, Soup,
  Sparkles, Stethoscope, Tag, Tent, Ticket, TrainFront, TrendingUp, Tv, Umbrella, Users, Utensils, Wallet, WalletCards,
  Watch, Wifi, Wrench, Zap,
  type LucideIcon,
} from 'lucide-react'

export interface IconEntry {
  /** Nama yang disimpan di database. Jangan diubah setelah dipakai. */
  name: string
  Icon: LucideIcon
  /** Kata kunci pencarian dalam bahasa Indonesia. */
  label: string
}

export interface IconGroup {
  label: string
  icons: IconEntry[]
}

function entry(name: string, Icon: LucideIcon, label: string): IconEntry {
  return { name, Icon, label }
}

export const ICON_GROUPS: IconGroup[] = [
  {
    label: 'Keuangan',
    icons: [
      entry('wallet', Wallet, 'dompet tunai'),
      entry('landmark', Landmark, 'bank'),
      entry('building', Building2, 'kantor gedung'),
      entry('smartphone', Smartphone, 'hp e-wallet mobile banking'),
      entry('credit-card', CreditCard, 'kartu debit kredit'),
      entry('wallet-cards', WalletCards, 'kartu dompet'),
      entry('banknote', Banknote, 'uang gaji'),
      entry('coins', Coins, 'koin receh'),
      entry('hand-coins', HandCoins, 'bayar pinjam'),
      entry('piggy-bank', PiggyBank, 'tabungan celengan'),
      entry('receipt', Receipt, 'struk tagihan'),
      entry('chart-line', ChartLine, 'investasi grafik'),
      entry('trending-up', TrendingUp, 'naik untung'),
      entry('award', Award, 'bonus penghargaan'),
      entry('badge-percent', BadgePercent, 'diskon promo cashback'),
      entry('briefcase', Briefcase, 'kerja kantor'),
      entry('laptop', Laptop, 'freelance komputer'),
      entry('gift', Gift, 'hadiah kado'),
    ],
  },
  {
    label: 'Makan dan belanja',
    icons: [
      entry('utensils', Utensils, 'makan makanan'),
      entry('coffee', Coffee, 'kopi minuman'),
      entry('cup-soda', CupSoda, 'minuman es teh'),
      entry('pizza', Pizza, 'pizza jajan'),
      entry('sandwich', Sandwich, 'roti sarapan'),
      entry('soup', Soup, 'sup bakso mie'),
      entry('beef', Beef, 'daging lauk'),
      entry('croissant', Croissant, 'roti kue'),
      entry('cookie', Cookie, 'camilan snack'),
      entry('ice-cream', IceCreamCone, 'es krim'),
      entry('apple', Apple, 'buah sayur'),
      entry('shopping-basket', ShoppingBasket, 'belanja dapur pasar'),
      entry('shopping-cart', ShoppingCart, 'belanja bulanan'),
      entry('shopping-bag', ShoppingBag, 'belanja online'),
      entry('package', Package, 'paket kiriman ongkir'),
    ],
  },
  {
    label: 'Transportasi',
    icons: [
      entry('fuel', Fuel, 'bensin bbm'),
      entry('motorbike', Motorbike, 'motor ojek'),
      entry('car', Car, 'mobil taksi'),
      entry('bike', Bike, 'sepeda gowes'),
      entry('bus', Bus, 'bus angkot'),
      entry('train', TrainFront, 'kereta krl mrt'),
      entry('plane', Plane, 'pesawat liburan'),
      entry('wrench', Wrench, 'servis bengkel sparepart'),
    ],
  },
  {
    label: 'Rumah dan tagihan',
    icons: [
      entry('house', House, 'rumah kos sewa'),
      entry('zap', Zap, 'listrik pln token'),
      entry('droplet', Droplet, 'air pdam'),
      entry('flame', Flame, 'gas elpiji'),
      entry('wifi', Wifi, 'internet kuota pulsa'),
      entry('tv', Tv, 'tv langganan streaming'),
      entry('plug', Plug, 'listrik alat'),
      entry('lamp', Lamp, 'perabot lampu'),
      entry('sofa', Sofa, 'perabot furnitur'),
      entry('key', KeyRound, 'kunci sewa'),
    ],
  },
  {
    label: 'Pribadi dan kesehatan',
    icons: [
      entry('sparkles', Sparkles, 'skincare kecantikan'),
      entry('shirt', Shirt, 'baju outfit pakaian'),
      entry('footprints', Footprints, 'sepatu sandal'),
      entry('scissors', Scissors, 'potong rambut salon'),
      entry('glasses', Glasses, 'kacamata'),
      entry('watch', Watch, 'jam aksesoris'),
      entry('gem', Gem, 'perhiasan'),
      entry('heart-pulse', HeartPulse, 'kesehatan'),
      entry('pill', Pill, 'obat apotek'),
      entry('stethoscope', Stethoscope, 'dokter rumah sakit'),
      entry('dumbbell', Dumbbell, 'olahraga gym'),
      entry('umbrella', Umbrella, 'asuransi'),
      entry('baby', Baby, 'anak bayi'),
      entry('dog', Dog, 'hewan peliharaan anjing'),
      entry('cat', Cat, 'hewan peliharaan kucing'),
    ],
  },
  {
    label: 'Hiburan dan hobi',
    icons: [
      entry('gamepad', Gamepad2, 'game hiburan'),
      entry('clapperboard', Clapperboard, 'film bioskop'),
      entry('music', Music, 'musik konser'),
      entry('headphones', Headphones, 'musik audio'),
      entry('ticket', Ticket, 'tiket acara'),
      entry('book', BookOpen, 'buku bacaan'),
      entry('camera', Camera, 'foto kamera'),
      entry('palette', Palette, 'seni hobi'),
      entry('tent', Tent, 'kemah outdoor'),
      entry('mountain', Mountain, 'naik gunung jalan-jalan'),
      entry('party', PartyPopper, 'pesta acara'),
    ],
  },
  {
    label: 'Lainnya',
    icons: [
      entry('graduation-cap', GraduationCap, 'pendidikan kuliah'),
      entry('school', School, 'sekolah spp'),
      entry('pencil', Pencil, 'alat tulis'),
      entry('heart-handshake', HeartHandshake, 'sedekah donasi zakat'),
      entry('hand-heart', HandHeart, 'amal sumbangan'),
      entry('users', Users, 'keluarga teman arisan'),
      entry('globe', Globe, 'online luar negeri'),
      entry('tag', Tag, 'label lain'),
      entry('ellipsis', Ellipsis, 'lainnya'),
    ],
  },
]

const ICONS_BY_NAME = new Map(ICON_GROUPS.flatMap((group) => group.icons).map((icon) => [icon.name, icon]))

export function getIcon(name: string): LucideIcon {
  return ICONS_BY_NAME.get(name)?.Icon ?? CircleHelp
}

export function isKnownIcon(name: string): boolean {
  return ICONS_BY_NAME.has(name)
}

export function searchIcons(query: string): IconEntry[] {
  const q = query.trim().toLocaleLowerCase('id')
  if (q === '') return []
  return ICON_GROUPS.flatMap((group) => group.icons).filter(
    (icon) => icon.label.includes(q) || icon.name.includes(q),
  )
}
