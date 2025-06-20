import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * 响应数据转换拦截器
 * 统一处理响应格式
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // 如果响应已经是标准格式，则直接返回
        if (data && typeof data === 'object' && 'code' in data) {
          return data;
        }

        // 否则，将数据包装成标准响应格式
        return {
          code: 200,
          data,
          errorMessage: null,
        };
      }),
    );
  }
}
