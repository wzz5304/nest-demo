import { UserAuth } from '../schemas/user-auth.schema';

export interface LoginResponse {
  user: UserAuth;
  access_token: string;
}
