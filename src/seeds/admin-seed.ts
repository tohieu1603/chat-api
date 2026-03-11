import 'reflect-metadata';
import { AppDataSource } from '../config/database.config';
import { User } from '../entities/user.entity';
import { UserRole } from '../constants/roles.constant';
import { hashPassword } from '../utils/password.util';

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@gmail.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'admin123';
const ADMIN_FULL_NAME = 'System Admin';

const seedAdmin = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    console.log('Database connected');

    const userRepo = AppDataSource.getRepository(User);

    const existingAdmin = await userRepo.findOne({ where: { email: ADMIN_EMAIL } });

    if (existingAdmin) {
      console.log('Admin user already exists, skipping seed');
    } else {
      const hashedPassword = await hashPassword(ADMIN_PASSWORD);

      const admin = userRepo.create({
        email: ADMIN_EMAIL,
        password: hashedPassword,
        fullName: ADMIN_FULL_NAME,
        role: UserRole.ADMIN,
        isActive: true,
      });

      await userRepo.save(admin);
      console.log('Admin user created successfully');
      console.log(`Email: ${ADMIN_EMAIL}`);
      console.log('Password: (as configured)');
    }

    await AppDataSource.destroy();
    console.log('Seed completed');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
};

seedAdmin();
