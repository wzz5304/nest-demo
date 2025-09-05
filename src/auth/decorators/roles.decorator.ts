import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../schemas/user-auth.schema';

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
