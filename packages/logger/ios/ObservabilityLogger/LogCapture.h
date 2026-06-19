#import <Foundation/Foundation.h>

@interface LogCapture : NSObject

typedef void (^LogCaptureCallback)(NSString *message, NSString *level, NSString *tag);

+ (instancetype)shared;
- (void)startWithCallback:(LogCaptureCallback)callback;
- (void)stop;

@end
