import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const sifreHash = await bcrypt.hash("patron123", 12);

  const patron = await prisma.user.upsert({
    where: { email: "patron@buro.com" },
    update: {},
    create: {
      ad: "Büro Sahibi",
      email: "patron@buro.com",
      sifreHash,
      rol: "PATRON",
    },
  });

  console.log("Patron kullanıcısı oluşturuldu:", patron.email);
  console.log("Şifre: patron123  ← Giriş sonrası değiştirin!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
