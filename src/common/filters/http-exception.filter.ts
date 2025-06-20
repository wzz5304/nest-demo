import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

/**全局异常过滤器 统一将错误信息过滤成 ApiResponse格式 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as any;

    // 处理验证错误
    if (status === HttpStatus.BAD_REQUEST && exceptionResponse.message) {
      // 如果是数组，只取第一个错误消息
      const message = Array.isArray(exceptionResponse.message)
        ? exceptionResponse.message[0]
        : exceptionResponse.message;

      return response.status(status).json({
        code: status,
        data: null,
        errorMessage: message,
      });
    }

    // 处理其他类型的错误
    return response.status(status).json({
      code: status,
      data: null,
      errorMessage: exceptionResponse.message || null,
    });
  }
}
