import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ExcludeNullInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((value) => {
        console.log('连接器', value);
        if (typeof value === 'object') {
          return Object.keys(value).reduce((obj, key) => {
            const val = value[key];
            obj[key] = val === null ? '' : val;
            return obj;
          }, {});
        }
        return value;
      }),
    );
  }
}
